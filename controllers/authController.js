// controllers/authController.js → FULLY TOKEN-BASED AUTH (NO COOKIES) – FINAL VERSION (December 27, 2025)

import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// ---------------- Signup ----------------
export const signup = async (req, res) => {
  try {
    const { name, email, password, phone, gender, dob } = req.body;

    if (!name || !email || !password || !phone || !gender || !dob) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      phone: phone.trim(),
      gender,
      dob: new Date(dob),
      avatar: req.file?.path || "",
      role: "user",
    });

    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      loggedIn: true,
      message: "Account created successfully!",
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: "user",
        avatar: newUser.avatar || null,
      },
    });
  } catch (err) {
    console.error("Signup Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ---------------- User Login ----------------
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    await User.findByIdAndUpdate(user._id, { lastActive: new Date() });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const joined = user.joined
      ? new Date(user.joined).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
        })
      : "Jan 2024";

    return res.json({
      loggedIn: true,
      message: "Login successful!",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone || "",
        avatar: user.avatar || "",
        joined,
        achievements: user.achievements || [],
        nutritionProgress: user.nutritionProgress || [],
        membership: user.membership || { plan: "Free", isActive: false },
      },
    });
  } catch (err) {
    console.error("Login Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ---------------- Admin Login ----------------
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const admin = await User.findOne({
      email: email.toLowerCase(),
      role: "admin",
    });

    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      return res.status(400).json({ message: "Invalid admin credentials" });
    }

    await User.findByIdAndUpdate(admin._id, { lastActive: new Date() });

    const token = jwt.sign(
      { id: admin._id, role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    const joined = admin.joined
      ? new Date(admin.joined).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
        })
      : "Jan 2024";

    return res.json({
      loggedIn: true,
      message: "Admin login successful",
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        avatar: admin.avatar || "",
        joined,
      },
    });
  } catch (err) {
    console.error("Admin Login Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ---------------- Logout (Client-side token removal) ----------------
export const logout = async (req, res) => {
  return res.json({
    success: true,
    message: "Logged out successfully (token removed from client)",
  });
};

// ---------------- Me (Current Authenticated User) ----------------
export const me = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        loggedIn: false,
        user: null,
        message: "Not authorized",
      });
    }

    const user = await User.findById(req.user.id)
      .select("-password -__v")
      .populate("assignedWorkouts")
      .populate("assignedChallenges")
      .populate("assignedClasses")
      .populate("assignedNutritionPlans")
      .populate({ path: "nutritionProgress.planId", select: "_id" })
      .populate({ path: "nutritionProgress.completedMeals.mealId", select: "_id" })
      .lean();

    if (!user) {
      return res.status(401).json({
        loggedIn: false,
        user: null,
        message: "User not found",
      });
    }

    const joined = user.joined
      ? new Date(user.joined).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
        })
      : "Jan 2024";

    return res.json({
      loggedIn: true,
      user: {
        id: user._id,
        name: user.name,
        role: user.role || "user",
        email: user.email,
        phone: user.phone || "",
        gender: user.gender || "",
        dob: user.dob || "",
        address: user.address || "",
        avatar: user.avatar || "",
        lastActive: user.lastActive,
        joined,
        membership: user.membership || { plan: "Free", isActive: false },
        healthMetrics: user.healthMetrics || {},
        fitnessPreferences: user.fitnessPreferences || {},
        trainer: user.trainer || {},
        assigned: {
          programs: user.assignedWorkouts || [],
          classes: user.assignedClasses || [],
          challenges: user.assignedChallenges || [],
          nutrition: user.assignedNutritionPlans || [],
        },
        purchasedPrograms: user.purchasedPrograms || [],
        purchasedClasses: user.purchasedClasses || [],
        purchasedChallenges: user.purchasedChallenges || [],
        purchasedNutritionPlans: user.purchasedNutritionPlans || [],
        enrolledPrograms: user.enrolledPrograms || [],
        achievements: user.achievements || [],
        nutritionProgress: user.nutritionProgress || [],
      },
    });
  } catch (err) {
    console.error("ME Error:", err);
    return res.status(401).json({
      loggedIn: false,
      user: null,
      message: "Token invalid or expired",
    });
  }
};

// ---------------- Get User Programs ----------------
export const getUserPrograms = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: "enrolledPrograms.programId",
      model: "Program",
      match: { status: "Active" },
    });

    if (!user.membership?.isActive) {
      return res.json({
        programs: [],
        total: 0,
        message: "No active membership found",
      });
    }

    const programs = user.enrolledPrograms
      .filter((ep) => ep.programId)
      .map((ep) => ep.programId)
      .filter((p, index, self) => self.indexOf(p) === index);

    console.log(`✅ ${programs.length} programs loaded for user ${req.user.id}`);

    res.json({
      programs,
      total: programs.length,
      membership: user.membership,
    });
  } catch (err) {
    console.error("Get User Programs Error:", err);
    res.status(500).json({ message: "Failed to load programs" });
  }
};

// ---------------- Get User Progress ----------------
export const getUserProgress = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      completedExercises: user.completedExercises || [],
      enrolledPrograms: user.enrolledPrograms || [],
      progress: user.progress || {},
    });
  } catch (err) {
    console.error("Get User Progress Error:", err);
    res.status(500).json({ message: "Failed to load progress" });
  }
};

// ---------------- Save User Progress ----------------
export const saveUserProgress = async (req, res) => {
  try {
    const { programId, dayIndex, exerciseId } = req.body;
    const user = await User.findById(req.user.id);

    if (!user.completedExercises) user.completedExercises = [];

    const exerciseIdStr = exerciseId.toString();
    if (!user.completedExercises.includes(exerciseIdStr)) {
      user.completedExercises.push(exerciseIdStr);

      const enrolledProgram = user.enrolledPrograms.find(
        (ep) => ep.programId.toString() === programId
      );

      if (enrolledProgram) {
        enrolledProgram.progress = (enrolledProgram.progress || 0) + 1;
        enrolledProgram.lastCompleted = new Date();
      }

      await user.save();

      console.log(`✅ Progress saved: Exercise ${exerciseIdStr} for program ${programId}`);
      res.json({
        message: "Progress saved successfully!",
        totalCompleted: user.completedExercises.length,
      });
    } else {
      res.json({ message: "Exercise already completed" });
    }
  } catch (err) {
    console.error("Save User Progress Error:", err);
    res.status(500).json({ message: "Failed to save progress" });
  }
};

// ---------------- Update Profile ----------------
// Note: Use protect middleware on route — no manual token check needed
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const fields = ["name", "email", "phone", "gender", "dob", "address", "healthMetrics", "fitnessPreferences", "trainer"];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) user[field] = req.body[field];
    });

    if (req.file?.path) user.avatar = req.file.path;

    await user.save();

    const joined = user.joined
      ? new Date(user.joined).toLocaleDateString("en-US", { year: "numeric", month: "short" })
      : "Jan 2024";

    res.json({
      message: "Profile updated successfully",
      user: { ...user.toObject(), joined },
    });
  } catch (err) {
    console.error("Update Profile Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ---------------- Change Password ----------------
export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both passwords are required" });
    }

    const user = await User.findById(req.user.id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Update Password Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ---------------- Update Preferences ----------------
export const updatePreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const { emailNotifications, smsNotifications, accountAlerts } = req.body;

    user.emailNotifications = emailNotifications ?? user.emailNotifications;
    user.smsNotifications = smsNotifications ?? user.smsNotifications;
    user.accountAlerts = accountAlerts ?? user.accountAlerts;

    await user.save();

    res.json({
      message: "Preferences saved successfully",
      preferences: {
        emailNotifications: user.emailNotifications,
        smsNotifications: user.smsNotifications,
        accountAlerts: user.accountAlerts,
      },
    });
  } catch (err) {
    console.error("Update Preferences Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ---------------- ADMIN FUNCTIONS ----------------

// Get All Users
export const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status = "all" } = req.query;
    const filter = {};

    if (search) {
      filter.$or = [
        { name: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
        { phone: new RegExp(search, "i") },
      ];
    }

    const today = new Date();
    if (status !== "all") {
      if (status === "active") filter["membership.expiresAt"] = { $gte: today };
      if (status === "expired") filter["membership.expiresAt"] = { $lt: today };
      if (status === "pending") filter["membership.expiresAt"] = null;
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(filter).select("-password").sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    const formatted = users.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      phone: u.phone || "",
      joinDate: u.joined || u.createdAt,
      membership: u.membership?.expiresAt
        ? new Date(u.membership.expiresAt) >= today
          ? "Active"
          : "Expired"
        : "Pending",
      plan: u.membership?.plan || "No Plan",
      programsCount: u.enrolledPrograms?.length || 0,
      avatar: u.avatar || u.name.split(" ").map((n) => n[0]).join(""),
    }));

    res.json({
      success: true,
      users: formatted,
      total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Get All Users Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Get Single User
export const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("enrolledPrograms.programId");

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const today = new Date();

    const formattedUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      joinDate: user.joined || user.createdAt,
      membership: user.membership?.expiresAt
        ? new Date(user.membership.expiresAt) >= today
          ? "Active"
          : "Expired"
        : "Pending",
      plan: user.membership?.plan || "No Plan",
      programsCount: user.enrolledPrograms?.length || 0,
      programs: user.enrolledPrograms?.map((ep) => ({
        title: ep.programId?.title || ep.title,
        progress: ep.progress || 0,
      })) || [],
      avatar: user.avatar,
    };

    res.json({ success: true, user: formattedUser });
  } catch (err) {
    console.error("Get User Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Delete User
export const deleteUser = async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete User Error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
