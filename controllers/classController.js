import ClassModel from "../models/Class.js";
import { ClassProgress } from "../models/Class.js";
import mongoose from "mongoose";
import { sendNotification } from "../services/notificationService.js";
import User from "../models/User.js";
const transformFrontendToBackend = (
  data,
  thumbnailUrl = null,
  exerciseThumbnails = {}
) => {
  const existingThumbnail =
    data.thumbnail && typeof data.thumbnail === "object"
      ? data.thumbnail.url || data.thumbnail
      : data.thumbnail;

  const daysWithThumbnails = (data.days || []).map((day, dayIndex) => ({
    title: day.title || "Untitled Day",
    exercises: (day.exercises || []).map((ex, exIndex) => {
      const key = `exercise_${dayIndex}_${exIndex}`;
      const newThumb = exerciseThumbnails[key]; // Cloudinary URL

      const oldThumb =
        ex.thumbnail && typeof ex.thumbnail === "object"
          ? ex.thumbnail.url || ex.thumbnail
          : ex.thumbnail;
      return {
        title: ex.title || "Exercise",
        type: ex.type || "time",
        time: ex.time != null ? ex.time : null,
        reps: ex.reps != null ? ex.reps : null,
        sets: ex.sets != null ? ex.sets : null,
        notes: ex.notes || "",
        thumbnail: newThumb || null,
        section: ex.section || "Workout",
      };
    }),
  }));

  return {
    title: data.title || "Untitled",
    description: data.description || "",
    thumbnail: thumbnailUrl || null,
    price: Number(data.price) || 0,
    level: data.level || "Beginner",
    duration: data.duration || "30 – 45 min",
    trainerName: data.trainerName || "",
    status: data.status || "Active",
    plans: data.plans || [],
    date: data.date || null,
    time: data.time || "",
    caloriesBurned: data.caloriesBurned || "0 kcal",
    days: daysWithThumbnails,
    equipment: data.equipment || [],
  };
};

// ------------------ Helper: safe JSON parse ------------------
const parseIfString = (val) => {
  if (!val) return {};
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch (e) {
      console.warn("Could not parse JSON, returning empty object", e);
      return {};
    }
  }
  return val;
};

// ------------------ CREATE CLASS  ------------------
export const createClass = async (req, res) => {
  try {
    console.log("CREATE CLASS START");

    // Parse data
    let data = {};
    if (req.body?.data) {
      data = parseIfString(req.body.data);
    }

    // MAIN THUMBNAIL
    const thumbnailFile = req.files?.find((f) => f.fieldname === "thumbnail");
    const mainThumbnail = thumbnailFile ? thumbnailFile.path : null;

    console.log("Main thumbnail file:", thumbnailFile ? "Found" : "Not found");
    console.log("Main thumbnail URL:", mainThumbnail);

    // EXERCISE THUMBNAILS
    const exerciseThumbnails = {};
    req.files?.forEach((f) => {
      if (f.fieldname.startsWith("exercise_")) {
        const key = f.fieldname.replace("exercise_", "");
        exerciseThumbnails[key] = f.path;
        console.log(`Exercise thumb: ${f.fieldname} → ${f.path}`);
      }
    });

    console.log(
      "Total exercise thumbnails mapped:",
      Object.keys(exerciseThumbnails).length
    );

    // TRANSFORM
    const transformed = transformFrontendToBackend(
      data,
      mainThumbnail,
      exerciseThumbnails
    );
    console.log("Days count:", transformed.days.length);
    console.log(
      "Total exercises:",
      transformed.days.reduce((sum, day) => sum + day.exercises.length, 0)
    );

    //  SAVE
    const newClass = new ClassModel(transformed);
    const savedClass = await newClass.save();
    // ====== NOTIFICATIONS FOR NEW CLASS ======
    try {
      // 1. All users ko new class ki khabar
      const allUsers = await User.find({});
      for (const user of allUsers) {
        await sendNotification(
          user._id,
          "user",
          "New Live Class Launched! ",
          `"${savedClass.title}" by ${
            savedClass.trainerName || "our trainer"
          } is now available!`,
          "success",
          "activity"
        );
      }

      // 2. Admins ko notification
      const admins = await User.find({ role: "admin" });
      for (const admin of admins) {
        await sendNotification(
          admin._id,
          "admin",
          "New Class Created",
          `Class "${savedClass.title}" has been successfully added.`,
          "success",
          "activity"
        );
      }
    } catch (notifyErr) {
      console.error("Notification error after class create:", notifyErr);
      // Fail silently — class to ban gaya hai
    }
    console.log("SAVED:", savedClass._id);
    res.status(201).json(savedClass);
  } catch (err) {
    console.error(" CREATE ERROR:", err);
    res.status(500).json({
      message: "Failed to create class",
      error: err.message,
      code: err.code,
    });
  }
};

// ------------------ UPDATE CLASS ------------------
export const updateClass = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid class ID" });
    }

    // Parse frontend data
    let updates = {};
    if (req.body?.data) {
      updates = JSON.parse(req.body.data);
    } else {
      updates = req.body;
    }

    // 1. Handle main thumbnail upload
    const mainThumbFile = req.files?.find((f) => f.fieldname === "thumbnail");
    if (mainThumbFile) {
      updates.thumbnail = mainThumbFile.path; // Cloudinary URL (string)
    }

    // 2. Clean main thumbnail if it's a blob object
    if (updates.thumbnail && typeof updates.thumbnail === "object") {
      if (
        updates.thumbnail.url &&
        updates.thumbnail.url.startsWith("http") &&
        !updates.thumbnail.url.startsWith("blob:")
      ) {
        updates.thumbnail = updates.thumbnail.url;
      } else {
        delete updates.thumbnail; // blob → ignore
      }
    }

    // 3. Collect uploaded exercise thumbnails (index-based keys like "0_1")
    const exerciseThumbnails = {};
    req.files?.forEach((f) => {
      if (f.fieldname.startsWith("exercise_")) {
        const key = f.fieldname.replace("exercise_", ""); // e.g., "0_1"
        exerciseThumbnails[key] = f.path; // Cloudinary URL
      }
    });

    // 4. Clean and update days.exercises.thumbnails
    if (updates.days && Array.isArray(updates.days)) {
      updates.days = updates.days.map((day, dayIdx) => ({
        ...day,
        _id: day._id || undefined,
        title: day.title || "Untitled Day",
        exercises: (day.exercises || []).map((ex, exIdx) => {
          const key = `${dayIdx}_${exIdx}`;
          const newUploadedThumb = exerciseThumbnails[key]; // new Cloudinary URL if uploaded

          let thumb = ex.thumbnail;

          // Clean blob object
          if (thumb && typeof thumb === "object") {
            if (
              thumb.url &&
              thumb.url.startsWith("http") &&
              !thumb.url.startsWith("blob:")
            ) {
              thumb = thumb.url; // keep real Cloudinary URL
            } else {
              thumb = null; // blob → remove
            }
          }

          return {
            ...ex,
            _id: ex._id || undefined,
            title: ex.title || "Exercise",
            type: ex.type || "time",
            time: ex.time ?? null,
            reps: ex.reps ?? null,
            sets: ex.sets ?? null,
            notes: ex.notes || "",
            section: ex.section || "Workout",
            thumbnail: newUploadedThumb || thumb || null,
          };
        }),
      }));
    }

    // Optional: remove empty fields
    if (!updates.thumbnail) delete updates.thumbnail;

    // Final update
    const updatedClass = await ClassModel.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
      overwrite: false,
    });

    if (!updatedClass) {
      return res.status(404).json({ message: "Class not found" });
    }

    res.status(200).json({
      success: true,
      data: updatedClass,
    });
  } catch (error) {
    console.error("UPDATE CLASS ERROR:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ------------------ GET ALL CLASSES FIXED ------------------
export const getAllClasses = async (req, res) => {
  try {
    const classes = await ClassModel.find().sort({ createdAt: -1 }).lean();
    console.log(` Total classes in DB: ${classes.length}`);
    res.json(classes);
  } catch (err) {
    console.error(" GET ALL ERROR:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch classes", error: err.message });
  }
};

// ------------------ GET CLASS BY ID ------------------
export const getClassById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid class ID" });
    }

    const cls = await ClassModel.findById(id).lean();
    if (!cls) return res.status(404).json({ message: "Class not found" });

    res.json(cls);
  } catch (err) {
    console.error("GET BY ID ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};
// ------------------ DELETE CLASS ------------------
export const deleteClass = async (req, res) => {
  try {
    const cls = await ClassModel.findByIdAndDelete(req.params.id);
    if (!cls) return res.status(404).json({ message: "Class not found" });
    res.json({ message: "Class deleted successfully" });
  } catch (err) {
    console.error(" DELETE ERROR:", err);
    res.status(500).json({ message: "Delete failed", error: err.message });
  }
};

// ------------------ LIST ACTIVE CLASSES FIXED ------------------
export const listActiveClasses = async (req, res) => {
  try {
    const classes = await ClassModel.find({ status: "Active" })
      .sort({ createdAt: -1 })
      .lean();

    console.log(`Active classes for customers: ${classes.length}`);
    res.json(classes);
  } catch (err) {
    console.error(" ACTIVE CLASSES ERROR:", err);
    res
      .status(500)
      .json({ message: "Failed to fetch active classes", error: err.message });
  }
};

// ------------------------ GET USER CLASSES — FINAL FIXED VERSION ------------------------
export const getUserClasses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    let finalClasses = [];

    // 1. Purchased classes — अब 101% safe
    for (const purchased of user.purchasedClasses || []) {
      if (!purchased.classId) continue;

      let classObjectId;
      try {
        // String हो या ObjectId object — दोनों handle करेगा
        classObjectId = new mongoose.Types.ObjectId(
          String(purchased.classId).trim()
        );
      } catch (err) {
        console.warn("Invalid classId in purchasedClasses:", purchased.classId);
        continue; // skip corrupted entry
      }

      const cls = await ClassModel.findById(classObjectId).lean();
      if (cls) finalClasses.push(cls);
    }

    // 2. Assigned classes — भी safe
    for (const assignedId of user.assignedClasses || []) {
      if (!assignedId) continue;

      let classObjectId;
      try {
        classObjectId = new mongoose.Types.ObjectId(String(assignedId).trim());
      } catch (err) {
        console.warn("Invalid assignedClass ID:", assignedId);
        continue;
      }

      const cls = await ClassModel.findById(classObjectId).lean();
      if (cls) finalClasses.push(cls);
    }

    // 3. Membership classes
    if (user.membership?.isActive) {
      const allowedPlans = ["Basic"];
      if (user.membership.plan === "Premium") allowedPlans.push("Premium");
      if (user.membership.plan === "Pro") allowedPlans.push("Pro");

      const membershipClasses = await ClassModel.find({
        status: "Active",
        plans: { $in: allowedPlans },
      }).lean();

      finalClasses.push(...membershipClasses);
    }

    // Remove duplicates
    const uniqueClasses = Object.values(
      finalClasses.reduce((acc, cls) => {
        const key = cls._id.toString();
        if (!acc[key]) acc[key] = cls;
        return acc;
      }, {})
    );

    // Clean response
    const clean = uniqueClasses.map((c) => ({
      _id: c._id,
      id: c._id.toString(),
      title: c.title,
      description: c.description || "",
      thumbnail: c.thumbnail || "/default-class.jpg",
      duration: c.duration || "30-45 min",
      level: c.level || "Beginner",
      trainerName: c.trainerName || "Trainer",
      caloriesBurned: c.caloriesBurned || "0 kcal",
      status: c.status || "Active",
      plans: c.plans || [],
      days: c.days || [],
      equipment: c.equipment || [],
      section: c.section || "",
    }));

    res.json({ classes: clean, total: clean.length });
  } catch (err) {
    console.error("getUserClasses Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------ TOGGLE CLASS STATUS ------------------
// controllers/classController.js

export const toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const cls = await ClassModel.findById(id);
    if (!cls) return res.status(404).json({ message: "Class not found" });

    // Simply toggle whatever is currently stored
    cls.status = cls.status === "Active" ? "Inactive" : "Active";
    await cls.save();

    res.json({
      message: `Class status updated to ${cls.status}`,
      class: cls,
    });
  } catch (err) {
    console.error("TOGGLE STATUS ERROR:", err);
    res.status(500).json({
      message: "Failed to toggle status",
      error: err.message,
    });
  }
};

// get progress
export const getClassProgress = async (req, res) => {
  try {
    const progress = await ClassProgress.findOne({
      user: req.user._id,
      classId: req.params.classId,
    });
    res.json({
      progress: progress || {
        completedExercises: [],
        streak: 0,
        achievements: [],
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// save progress
// save progress
export const saveClassProgress = async (req, res) => {
  const { classId, completedExerciseId, completedExercises } = req.body;

  try {
    let progress = await ClassProgress.findOne({
      user: req.user._id,
      classId,
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let isNewProgress = false; // Track if new exercise was completed today

    if (!progress) {
      progress = new ClassProgress({
        user: req.user._id,
        classId,
        completedExercises: completedExerciseId ? [completedExerciseId] : [],
        lastCompletedDate: today,
        streak: 1,
        achievements: ["first_ex"],
      });
      isNewProgress = true;
    } else {
      if (
        completedExerciseId &&
        !progress.completedExercises.includes(completedExerciseId)
      ) {
        progress.completedExercises.push(completedExerciseId);
        isNewProgress = true;

        // Streak logic
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        if (
          progress.lastCompletedDate?.toDateString() ===
          yesterday.toDateString()
        ) {
          progress.streak += 1;
        } else {
          progress.streak = 1;
        }
        progress.lastCompletedDate = today;

        // Achievements
        if (
          progress.completedExercises.length >= 10 &&
          !progress.achievements.includes("ten_ex")
        ) {
          progress.achievements.push("ten_ex");
        }
        if (
          progress.streak >= 7 &&
          !progress.achievements.includes("seven_day_streak")
        ) {
          progress.achievements.push("seven_day_streak");
        }
        progress.achievements = [...new Set(progress.achievements)];
      }

      if (Array.isArray(completedExercises)) {
        progress.completedExercises = completedExercises;
      }
    }

    await progress.save();

    // ====== NOTIFICATIONS ONLY ON NEW PROGRESS ======
    if (isNewProgress) {
      const cls = await ClassModel.findById(classId).lean();
      if (!cls) {
        return res.json({ progress });
      }

      const currentStreak = progress.streak || 1;

      try {
        // User notification
        await sendNotification(
          req.user._id,
          "user",
          "Progress Made! Well Done!",
          `You completed an exercise in "${cls.title}"!${
            currentStreak >= 3
              ? ` Keep your ${currentStreak}-day streak going!`
              : " Amazing consistency!"
          }`,
          "success",
         "activity"
        );

        // Special 7-day streak celebration
        if (currentStreak === 7) {
          await sendNotification(
            req.user._id,
            "user",
            "7-Day Streak Achieved!",
            "You're crushing it with classes! Incredible dedication!",
            "success",
           "activity"
          );
        }
      } catch (notifyErr) {
        console.error("User class progress notification failed:", notifyErr);
      }

      // Admin notifications
      try {
        const user = await User.findById(req.user._id).lean();
        const shortName = user?.name
          ? user.name.trim().split(" ")[0].charAt(0).toUpperCase() +
            user.name.trim().split(" ")[0].slice(1).toLowerCase()
          : "A user";

        const admins = await User.find({ role: "admin" });
        for (const admin of admins) {
          await sendNotification(
            admin._id,
            "admin",
            "Class Progress",
            `${shortName} completed an exercise in "${cls.title}".`,
            "success",
           "activity"
          );
        }

        if (currentStreak === 7) {
          for (const admin of admins) {
            await sendNotification(
              admin._id,
              "admin",
              "User Milestone",
              `${user?.name || "A user"} achieved a 7-day streak in classes!`,
              "success",
             "activity"
            );
          }
        }
      } catch (adminErr) {
        console.error("Admin class notification failed:", adminErr);
      }
    }

    res.json({ progress });
  } catch (err) {
    console.error("saveClassProgress Error:", err);
    res.status(500).json({ message: "Failed to save progress" });
  }
};
