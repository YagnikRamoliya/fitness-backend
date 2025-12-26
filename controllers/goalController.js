// controllers/goalController.js
import BusinessGoal from "../models/BusinessGoal.js";
import Order from "../models/Order.js";
import mongoose from "mongoose";
import User from "../models/User.js";

const getCurrentPeriod = () => new Date().toISOString().slice(0, 7); 

export const getCurrentGoals = async (req, res) => {
  try {
    const period = getCurrentPeriod();
    let doc = await BusinessGoal.findOne({ period });

    if (!doc) {
      // Auto-create with default goals
      doc = await BusinessGoal.create({
        period,
        goals: [
          { label: "Monthly Revenue", target: 2500000, color: "#e3002a" },
          { label: "New Member Growth", target: 1500, color: "#10b981" },
          { label: "Member Retention", target: 92, color: "#5c9fff" },
        ],
      });
    }
    res.json({
      success: true,
      data: {
        period: doc.period,
        goals: doc.goals,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ADD a new goal
export const addGoal = async (req, res) => {
  try {
    const { label, target, color, dataSource = "revenue" } = req.body;
    const period = getCurrentPeriod();

    if (!label || !target) {
      return res
        .status(400)
        .json({ success: false, message: "Label and target required" });
    }

    const updateObj = {
      $push: {
        goals: {
          label,
          target: Number(target),
          color: color || "#e3002a",
          dataSource, 
        },
      },
      $setOnInsert: { period },
    };

    if (req.user?._id) {
      updateObj.$setOnInsert.setBy = req.user._id;
    }

    const updated = await BusinessGoal.findOneAndUpdate({ period }, updateObj, {
      upsert: true,
      new: true,
    });

    res.json({ success: true, message: "Goal added!", data: updated });
  } catch (err) {
    console.error("Add Goal Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// UPDATE a goal
export const updateGoal = async (req, res) => {
  try {
    const { goalId } = req.params;
    const { label, target, color, dataSource } = req.body; 
    const period = getCurrentPeriod();

    const updateFields = {
      "goals.$.label": label,
      "goals.$.target": Number(target),
      "goals.$.color": color || "#e3002a",
    };

    if (dataSource) {
      updateFields["goals.$.dataSource"] = dataSource;
    }

    if (req.user?._id) {
      updateFields["setBy"] = req.user._id;
    }

    const updated = await BusinessGoal.findOneAndUpdate(
      { period, "goals._id": goalId },
      { $set: updateFields },
      { new: true }
    );

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Goal not found" });
    }

    res.json({ success: true, message: "Goal updated!", data: updated });
  } catch (err) {
    console.error("Update Goal Error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE a goal
export const deleteGoal = async (req, res) => {
  try {
    const { goalId } = req.params;
    const period = getCurrentPeriod();

    const updated = await BusinessGoal.findOneAndUpdate(
      { period },
      { $pull: { goals: { _id: goalId } } },
      { new: true }
    );

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Goal not found" });
    }

    res.json({ success: true, message: "Goal deleted!", data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getGoalStats = async (req, res) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthStart = new Date(currentYear, currentMonth, 1);
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayDate = new Date().getDate();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate(); 

    // 1. Today's Revenue
    const todayRevenueResult = await Order.aggregate([
      { $match: { status: "Completed", createdAt: { $gte: todayStart } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    // 2. This Month Revenue
    const monthRevenueResult = await Order.aggregate([
      { $match: { status: "Completed", createdAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]);

    // 3. New Members This Month
    const newSignupsMonth = await User.countDocuments({
      createdAt: { $gte: monthStart },
      role: { $ne: "admin" },
    });

    // 4. Today's New Signups
    const newSignupsToday = await User.countDocuments({
      createdAt: { $gte: todayStart },
      role: { $ne: "admin" },
    });

    // 5. Active Members 
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeMembers = await User.countDocuments({
      lastActive: { $gte: thirtyDaysAgo },
      role: { $ne: "admin" },
    });

    const totalMembers = await User.countDocuments({ role: { $ne: "admin" } });
    const retentionRate =
      totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0;

    let monthlyRevenueGoal = 2500000; 
    try {
      const goalDoc = await BusinessGoal.findOne({
        period: `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`,
      });

      if (goalDoc && goalDoc.goals && goalDoc.goals.length > 0) {
        const revenueGoalObj = goalDoc.goals.find(
          (g) =>
            g.dataSource === "revenue" ||
            g.label.toLowerCase().includes("revenue") ||
            g.label.toLowerCase().includes("monthly")
        );
        if (revenueGoalObj && revenueGoalObj.target) {
          monthlyRevenueGoal = Number(revenueGoalObj.target);
        }
      }
    } catch (err) {
      console.error("Failed to fetch monthly revenue goal:", err);
    }

    const expectedRevenueTillToday =
      (monthlyRevenueGoal / daysInMonth) * todayDate;
    const monthRevenue = monthRevenueResult[0]?.total || 0;
    const dailyProgressPercentage =
      expectedRevenueTillToday > 0
        ? Math.min(
            100,
            Math.round((monthRevenue / expectedRevenueTillToday) * 100)
          )
        : 0;

    const changeVsExpected =
      expectedRevenueTillToday > 0
        ? Math.round(
            ((monthRevenue - expectedRevenueTillToday) /
              expectedRevenueTillToday) *
              100
          )
        : monthRevenue > 0
        ? 100
        : 0;

    // Final Response
    res.json({
      success: true,
      stats: {
        // Revenue
        todayRevenue: todayRevenueResult[0]?.total || 0,
        monthRevenue,
        monthlyRevenueGoal,
        projectedRevenue: Math.round(
          (todayRevenueResult[0]?.total || 0) * daysInMonth
        ),

        // Daily Progress 
        dailyProgressPercentage,
        changeVsExpected,
        expectedRevenueTillToday: Math.round(expectedRevenueTillToday),
        daysPassed: todayDate,
        daysInMonth,

        // Members
        newSignupsToday,
        newSignupsMonth,
        activeMembers,
        totalMembers,
        retentionRate,
        churnRate: 100 - retentionRate,
      },
    });
  } catch (err) {
    console.error("getGoalStats Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
