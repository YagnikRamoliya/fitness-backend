// controllers/revenueController.js
import Order from "../models/Order.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import { startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from "date-fns";

const calculateTotalRevenue = (orders) => orders.reduce((sum, order) => sum + order.total, 0);

// 1. Total Revenue API (Overall or Filtered by Date Range)
export const getTotalRevenue = async (req, res) => {
  try {
    const { startDate, endDate } = req.query; 
    const filter = { status: "Completed" };
    
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const orders = await Order.find(filter);
    const totalRevenue = calculateTotalRevenue(orders);

    res.status(200).json({
      success: true,
      totalRevenue,
      currency: "INR",
      totalOrders: orders.length,
      averageOrderValue: orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0,
    });
  } catch (error) {
    console.error("getTotalRevenue Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// 2. Revenue Performance API (Daily/Weekly/Monthly Trends)
export const getRevenuePerformance = async (req, res) => {
  try {
    const { period = "daily" } = req.query; 
    let groupBy, project;

    if (period === "daily") {
      groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
      project = { day: "$_id" };
    } else if (period === "weekly") {
      groupBy = { $week: "$createdAt" };
      project = { week: "$_id" };
    } else if (period === "monthly") {
      groupBy = { $month: "$createdAt" };
      project = { month: "$_id" };
    } else {
      return res.status(400).json({ message: "Invalid period" });
    }

    const performance = await Order.aggregate([
      { $match: { status: "Completed" } },
      {
        $group: {
          _id: groupBy,
          revenue: { $sum: "$total" },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { ...project, revenue: 1, orders: 1 } },
    ]);

    res.status(200).json({
      success: true,
      period,
      data: performance,
    });
  } catch (error) {
    console.error("getRevenuePerformance Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// 3. Monthly Overview API 
export const getMonthlyOverview = async (req, res) => {
  try {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const prevMonthStart = startOfMonth(subMonths(now, 1));
    const prevMonthEnd = endOfMonth(subMonths(now, 1));

    // Current Month
    const currentOrders = await Order.find({
      status: "Completed",
      createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
    });
    const currentRevenue = calculateTotalRevenue(currentOrders);
    const currentUsers = await User.countDocuments({
      createdAt: { $gte: currentMonthStart, $lte: currentMonthEnd },
    });

    // Previous Month
    const prevOrders = await Order.find({
      status: "Completed",
      createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd },
    });
    const prevRevenue = calculateTotalRevenue(prevOrders);

    const revenueGrowth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    res.status(200).json({
      success: true,
      month: now.toLocaleString("default", { month: "long", year: "numeric" }),
      revenue: currentRevenue,
      orders: currentOrders.length,
      newUsers: currentUsers,
      growth: Math.round(revenueGrowth),
    });
  } catch (error) {
    console.error("getMonthlyOverview Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// 4. Membership Summary API 
export const getMembershipSummary = async (req, res) => {
  try {
    const memberships = await Order.find({ isMembershipPurchase: true, status: "Completed" });
    const totalRevenue = calculateTotalRevenue(memberships);
    const now = new Date();

    const active = memberships.filter((m) => new Date(m.membershipInfo.expiresAt) > now).length;
    const expired = memberships.length - active;

    res.status(200).json({
      success: true,
      totalMemberships: memberships.length,
      active,
      expired,
      revenue: totalRevenue,
      averageValue: memberships.length > 0 ? Math.round(totalRevenue / memberships.length) : 0,
    });
  } catch (error) {
    console.error("getMembershipSummary Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// 5. Plan Distribution API 
export const getPlanDistribution = async (req, res) => {
  try {
    const distribution = await Order.aggregate([
      { $match: { isMembershipPurchase: true, status: "Completed" } },
      {
        $group: {
          _id: "$membershipInfo.plan",
          count: { $sum: 1 },
          revenue: { $sum: "$total" },
        },
      },
      { $sort: { count: -1 } },
      { $project: { plan: "$_id", count: 1, revenue: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: distribution,
    });
  } catch (error) {
    console.error("getPlanDistribution Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// 6. Transactions API (List of All Orders/Transactions with Filters)
export const getTransactions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type } = req.query;
    const filter = { status: status || "Completed" };
    
    if (type === "membership") filter.isMembershipPurchase = true;
    if (type === "program") filter["programs.type"] = "program"; 

    const transactions = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("user", "name email"); // Optional: Populate user details

    const total = await Order.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("getTransactions Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// 7. Membership Users API (Users who took Membership + Their Payments)
export const getMembershipUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const memberships = await Order.find({ isMembershipPurchase: true, status: "Completed" })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate("user", "name email"); 

    const total = await Order.countDocuments({ isMembershipPurchase: true, status: "Completed" });

    const data = memberships.map((m) => ({
      userId: m.user?._id || "Guest",
      name: m.user?.name || m.userDetails.name,
      email: m.user?.email || m.userDetails.email,
      plan: m.membershipInfo.plan,
      payment: m.total,
      date: m.createdAt,
      expiresAt: m.membershipInfo.expiresAt,
      status: new Date(m.membershipInfo.expiresAt) > new Date() ? "Active" : "Expired",
    }));

    res.status(200).json({
      success: true,
      totalUsers: total,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("getMembershipUsers Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// 8. Revenue Report API 
export const getRevenueReport = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Daily
    const dailyOrders = await Order.find({
      status: "Completed",
      createdAt: { $gte: todayStart, $lte: todayEnd },
    });
    const dailyRevenue = calculateTotalRevenue(dailyOrders);

    // Weekly
    const weeklyOrders = await Order.find({
      status: "Completed",
      createdAt: { $gte: weekStart, $lte: weekEnd },
    });
    const weeklyRevenue = calculateTotalRevenue(weeklyOrders);

    // Monthly
    const monthlyOrders = await Order.find({
      status: "Completed",
      createdAt: { $gte: monthStart, $lte: monthEnd },
    });
    const monthlyRevenue = calculateTotalRevenue(monthlyOrders);

    // Breakdown by Type
    const breakdown = await Order.aggregate([
      { $match: { status: "Completed", createdAt: { $gte: monthStart, $lte: monthEnd } } },
      { $unwind: "$programs" }, 
      {
        $group: {
          _id: "$programs.type",
          revenue: { $sum: "$programs.price" },
          count: { $sum: 1 },
        },
      },
      { $project: { type: "$_id", revenue: 1, count: 1 } },
    ]);

    res.status(200).json({
      success: true,
      daily: { revenue: dailyRevenue, orders: dailyOrders.length },
      weekly: { revenue: weeklyRevenue, orders: weeklyOrders.length },
      monthly: { revenue: monthlyRevenue, orders: monthlyOrders.length },
      breakdown,
    });
  } catch (error) {
    console.error("getRevenueReport Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Today's Revenue
export const getTodayRevenue = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const orders = await Order.find({
      status: "Completed",
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    });

    const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

    res.json({
      success: true,
      revenue,
      ordersCount: orders.length,
      date: new Date().toLocaleDateString("en-IN"),
    });
  } catch (err) {
    console.error("getTodayRevenue Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Last 7 Days Revenue 
export const getLast7DaysRevenue = async (req, res) => {
  try {
    const days = [];
    const revenues = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0,0,0);

      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const orders = await Order.find({
        status: "Completed",
        createdAt: { $gte: date, $lt: nextDay },
      });

      const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

      days.push(date.toLocaleDateString("en-IN", { weekday: "short" }));
      revenues.push(revenue);
    }

    res.json({
      success: true,
      days,
      revenues,
    });
  } catch (err) {
    console.error("getLast7DaysRevenue Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};