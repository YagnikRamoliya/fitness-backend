// controllers/membershipController.js
import mongoose from "mongoose";
import Membership from "../models/Membership.js";
import User from "../models/User.js";
import Program from "../models/Program.js";
// import Challenge from "../models/Challenge.js";
import ClassModel from "../models/Class.js";
// import NutritionPlan from "../models/NutritionPlan.js";

// ------------------------------ CREATE MEMBERSHIP ------------------------------
export const createMembership = async (req, res) => {
  const { name, price, duration, features, popular, plans = [] } = req.body;

  try {
    const newMembership = new Membership({
      name,
      price,
      duration,
      features: features || [],
      popular: popular || false,
      plans,
    });

    const saved = await newMembership.save();

    res.status(201).json({
      message: "Membership created successfully!",
      membership: saved,
    });
  } catch (err) {
    console.error("Create Membership Error:", err);
    res.status(400).json({ message: err.message });
  }
};

// ------------------------------ GET ALL MEMBERSHIPS (FIXED - NO POPULATE) ------------------------------
export const getMemberships = async (req, res) => {
  try {
    const memberships = await Membership.find()
      .sort({ popular: -1, name: 1 }); // No populate → safe!

    // Enriched data (counts 0 hi rahenge kyunki direct refs nahi hain — future mein add kar sakte ho)
    const enrichedMemberships = memberships.map((membership) => ({
      ...membership.toObject(),
      workoutsCount: 0,
      challengesCount: 0,
      classesCount: 0,
      nutritionCount: 0,
      totalContent: 0,
    }));

    res.json(enrichedMemberships);
  } catch (err) {
    console.error("Get Memberships Error:", err);
    res.status(500).json({ message: "Failed to fetch memberships" });
  }
};

// ------------------------------ GET SINGLE MEMBERSHIP (FIXED) ------------------------------
export const getMembershipById = async (req, res) => {
  try {
    const membership = await Membership.findById(req.params.id);

    if (!membership) {
      return res.status(404).json({ message: "Membership not found" });
    }

    res.json({
      ...membership.toObject(),
      workoutsCount: 0,
      challengesCount: 0,
      classesCount: 0,
      nutritionCount: 0,
    });
  } catch (err) {
    console.error("Get Single Membership Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------------------ UPDATE MEMBERSHIP ------------------------------
export const updateMembership = async (req, res) => {
  try {
    const membership = await Membership.findById(req.params.id);
    if (!membership)
      return res.status(404).json({ message: "Membership not found" });

    const { name, price, duration, features, popular, plans = [] } = req.body;

    membership.name = name ?? membership.name;
    membership.price = price ?? membership.price;
    membership.duration = duration ?? membership.duration;
    membership.features = features ?? membership.features;
    membership.popular = popular ?? membership.popular;
    membership.plans = plans ?? membership.plans;

    const updated = await membership.save();

    res.status(200).json({
      message: "Membership updated successfully!",
      membership: updated,
    });
  } catch (err) {
    console.error("Update Membership Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ------------------------------ DELETE MEMBERSHIP ------------------------------
export const deleteMembership = async (req, res) => {
  try {
    const { id } = req.params;

    const membership = await Membership.findById(id);
    if (!membership) {
      return res.status(404).json({ message: "Membership not found" });
    }

    const usersWithMembership = await User.countDocuments({
      "membership._id": id,
    });

    if (usersWithMembership > 0) {
      return res.status(400).json({
        message: `Cannot delete! ${usersWithMembership} users have this membership active`,
      });
    }

    await Membership.findByIdAndDelete(id);

    res.status(200).json({
      message: `✅ "${membership.name}" membership deleted successfully!`,
    });
  } catch (err) {
    console.error("Delete Membership Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ------------------------------ ASSIGN MEMBERSHIP TO USER (UNCHANGED) ------------------------------
export const assignMembershipToUser = async (req, res) => {
  try {
    const { userId, membershipId } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(userId) ||
      !mongoose.Types.ObjectId.isValid(membershipId)
    ) {
      return res.status(400).json({ message: "Invalid userId or membershipId format" });
    }

    if (!userId || !membershipId) {
      return res.status(400).json({ message: "User ID and Membership ID required" });
    }

    const membership = await Membership.findById(membershipId);
    if (!membership) {
      return res.status(404).json({ message: "Membership not found" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const matchingPrograms = await Program.find({
      plans: { $in: membership.plans },
    });

    const startDate = new Date();
    let monthsToAdd = 1;
    const durationStr = membership.duration.toLowerCase();
    if (durationStr.includes("year")) monthsToAdd = 12;
    else if (durationStr.includes("month")) {
      const match = durationStr.match(/(\d+)\s*month/);
      monthsToAdd = match ? parseInt(match[1]) || 1 : 1;
    }
    const endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + monthsToAdd);

    user.membership = {
      _id: membership._id,
      plan: membership.name,
      price: membership.price,
      duration: membership.duration,
      features: membership.features,
      startedAt: startDate,
      expiresAt: endDate,
      isActive: true,
      popular: membership.popular || false,
    };

    user.markModified("membership");

    matchingPrograms.forEach((p) => {
      if (!user.assignedWorkouts.some((id) => id.toString() === p._id.toString())) {
        user.assignedWorkouts.push(p._id);
      }
    });

    matchingPrograms.forEach((program) => {
      const exists = user.enrolledPrograms.some(
        (p) => p.programId.toString() === program._id.toString()
      );
      if (!exists) {
        user.enrolledPrograms.push({
          programId: program._id,
          title: program.title,
          trainerName: program.trainerName || "Self-Guided",
          enrolledAt: new Date(),
          progress: 0,
          completedDays: 0,
        });
      }
    });

    await user.save();

    res.status(200).json({
      message: "Membership and content assigned successfully!",
      membership: user.membership,
      userId: user._id,
      totalAssignedPrograms: matchingPrograms.length,
      programTitles: matchingPrograms.map((p) => p.title),
    });
  } catch (err) {
    console.error("ASSIGNMENT ERROR:", err);
    res.status(500).json({ message: "Membership assignment failed", error: err.message });
  }
};

// ------------------------------ GET USER AVAILABLE PROGRAMS ------------------------------
export const getUserAvailablePrograms = async (req, res) => {
  try {
    // Sirf woh fields populate karo jo schema mein exist karte hain
    const user = await User.findById(req.params.userId)
      .populate("assignedWorkouts"); // ← sirf yeh safe hai

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Membership nested object hai, populate ki zarurat nahi — direct access
    if (!user.membership?.isActive) {
      return res.status(403).json({ 
        message: "No active membership",
        currentPlan: user.membership?.plan || "Free"
      });
    }

    const planTier = user.membership.plan;
    let allowedPlans = ["Basic"];

    if (planTier === "Premium") allowedPlans = ["Basic", "Premium"];
    if (planTier === "Pro") allowedPlans = ["Basic", "Premium", "Pro"];

    const availablePrograms = await Program.find({
      plans: { $in: allowedPlans },
    });

    res.json({
      programs: availablePrograms,
      total: availablePrograms.length,
      membership: user.membership, // direct nested object — no populate needed
      message: `Showing programs for ${planTier} membership`,
    });
  } catch (err) {
    console.error("Get Available Programs Error:", err);
    res.status(500).json({ message: "Server error while fetching programs" });
  }
};