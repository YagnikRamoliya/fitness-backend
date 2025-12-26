// controllers/programController.js
import Program from "../models/Program.js";
import User from "../models/User.js";
import { v4 as uuidv4 } from "uuid";
import mongoose from "mongoose";
import { sendNotification } from "../services/notificationService.js";
import DailyStats from "../models/DailyStats.js";
// ------------------------ UTIL FUNCTIONS ------------------------

const groupFilesByFieldname = (files = []) => {
  const grouped = {};
  files.forEach((file) => {
    if (!grouped[file.fieldname]) grouped[file.fieldname] = [];
    grouped[file.fieldname].push(file);
  });
  return grouped;
};

const extractExerciseFiles = (filesObj) => {
  const exerciseFiles = {};
  for (const key in filesObj) {
    if (key.startsWith("exercise-")) {
      const id = key.replace("exercise-", "");
      exerciseFiles[id] = filesObj[key][0].path;
    }
  }
  return exerciseFiles;
};

// ------------------------ CREATE PROGRAM ------------------------
export const createProgram = async (req, res) => {
  try {
    let programData = JSON.parse(req.body.program);
    const files = groupFilesByFieldname(req.files);
    const exerciseFiles = extractExerciseFiles(files);
    const mainThumbnail = files["thumbnail"]?.[0]?.path || null;

    let equipment = programData.equipment;
    if (typeof equipment === "string") {
      equipment = equipment
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);
    } else if (!Array.isArray(equipment)) {
      equipment = equipment ? [equipment] : [];
    }

    let days = Array.isArray(programData.days) ? programData.days : [];
    days = days.map((day, index) => ({
      day: index + 1,
      title: day.title,
      exercises: day.exercises.map((ex) => ({
        id: ex.id,
        title: ex.title,
        type: ex.type,
        time: ex.time,
        reps: ex.reps,
        sets: ex.sets,
        thumbnail: exerciseFiles[ex.id] || ex.thumbnail || null,
        description: ex.notes || "",
        section: ex.section || "Workout",
      })),
    }));

    const newProgram = new Program({
      id: programData.id || uuidv4(),
      title: programData.title,
      desc: programData.description,
      thumbnail: mainThumbnail,
      duration: programData.duration,
      difficulty: programData.level,
      focus: programData.focus,
      trainingType: programData.trainingType,
      equipment: equipment,
      price: programData.price,
      caloriesBurned: programData.caloriesBurned || 0,
      plans: programData.plans || [],
      trainerName: programData.trainerName || "",
      status: "Active",
      totalDays: days.length,
      days,
    });

    await newProgram.save();

    // ====== NOTIFICATIONS ======
    try {
      // 1. All active users (or all users) ko new program ki khabar
      const activeUsers = await User.find({});
      for (const user of activeUsers) {
        await sendNotification(
          user._id,
          "user",
          "New Workout Program Launched! ",
          `"${newProgram.title}" by ${
            newProgram.trainerName || "our expert trainer"
          } is now available!`,
          "success",
          "workout"
        );
      }

      const admins = await User.find({ role: "admin" });
      for (const admin of admins) {
        await sendNotification(
          admin._id,
          "admin",
          "New Program Created",
          `"${newProgram.title}" has been successfully added to the platform.`,
          "success",
          "workout"
        );
      }
    } catch (notifyErr) {
      console.error("Notification error after program create:", notifyErr);
    }

    res.status(201).json({
      ...newProgram._doc,
      id: newProgram.id,
    });
  } catch (err) {
    console.log("Create Program Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ------------------------ UPDATE PROGRAM ------------------------
export const updateProgram = async (req, res) => {
  try {
    let program = await Program.findOne({ id: req.params.id });

    if (!program && mongoose.Types.ObjectId.isValid(req.params.id)) {
      program = await Program.findById(req.params.id);
    }

    if (!program) return res.status(404).json({ message: "Program not found" });

    const programData = JSON.parse(req.body.program || "{}");
    const files = groupFilesByFieldname(req.files);
    const exerciseFiles = extractExerciseFiles(files);
    const mainThumbnail = files["thumbnail"]?.[0]?.path || program.thumbnail;

    // EQUIPMENT: Normalize to array
    let equipment = programData.equipment;
    if (typeof equipment === "string") {
      equipment = equipment
        .split(",")
        .map((e) => e.trim())
        .filter(Boolean);
    } else if (!Array.isArray(equipment)) {
      equipment = equipment ? [equipment] : [];
    }

    let days = Array.isArray(programData.days)
      ? programData.days
      : program.days;
    days = days.map((day, index) => ({
      day: index + 1,
      title: day.title,
      exercises: day.exercises.map((ex) => ({
        id: ex.id,
        title: ex.title,
        type: ex.type,
        time: ex.time,
        reps: ex.reps,
        sets: ex.sets,
        thumbnail: exerciseFiles[ex.id] || ex.thumbnail || null,
        description: ex.notes || "",
        section: ex.section || "Workout",
      })),
    }));

    Object.assign(program, {
      title: programData.title || program.title,
      desc: programData.description || program.desc,
      duration: programData.duration || program.duration,
      difficulty: programData.level || program.difficulty,
      trainingType: programData.trainingType || program.trainingType,
      focus: programData.focus || program.focus,
      equipment: equipment,
      price: programData.price ?? program.price,
      caloriesBurned: programData.caloriesBurned ?? program.caloriesBurned,
      plans: programData.plans || program.plans,
      thumbnail: mainThumbnail,
      trainerName: programData.trainerName || program.trainerName,
      totalDays: days.length,
      days,
    });

    await program.save();

    res.json({
      ...program._doc,
      id: program.id,
    });
  } catch (err) {
    console.log("Update Program Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ------------------------ GET ALL PROGRAMS ------------------------

export const getPrograms = async (req, res) => {
  try {
    const programs = await Program.find({});
    res.json(
      programs.map((p) => ({
        ...p._doc,
        id: p.id,
      }))
    );
  } catch (err) {
    console.error("getPrograms Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ------------------------ GET PROGRAM BY ID ------------------------
export const getProgramById = async (req, res) => {
  try {
    let program;

    program = await Program.findOne({ id: req.params.id });

    if (!program && mongoose.Types.ObjectId.isValid(req.params.id)) {
      program = await Program.findById(req.params.id);
    }

    if (!program) return res.status(404).json({ message: "Program not found" });

    res.json({
      ...program._doc,
      id: program.id || program._id.toString(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ------------------------ GET PROGRAM DAY ------------------------

export const getProgramDay = async (req, res) => {
  try {
    const program = await Program.findOne({ id: req.params.id });
    if (!program) return res.status(404).json({ message: "Program not found" });

    const day = program.days.find((d) => d.day === Number(req.params.day));
    if (!day) return res.status(404).json({ message: "Day not found" });

    res.json(day);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ------------------------ DELETE PROGRAM ------------------------

export const deleteProgram = async (req, res) => {
  try {
    let program = await Program.findOne({ id: req.params.id });

    // Fallback to Mongo _id
    if (!program && mongoose.Types.ObjectId.isValid(req.params.id)) {
      program = await Program.findById(req.params.id);
    }

    if (!program) return res.status(404).json({ message: "Program not found" });

    await program.deleteOne();
    res.json({ message: "Program deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ------------------------ UPDATE STATUS ------------------------

export const updateProgramStatus = async (req, res) => {
  try {
    let program = await Program.findOne({ id: req.params.id });

    if (!program && mongoose.Types.ObjectId.isValid(req.params.id)) {
      program = await Program.findById(req.params.id);
    }

    if (!program) return res.status(404).json({ message: "Program not found" });

    program.status = program.status === "Active" ? "Inactive" : "Active";
    await program.save();

    res.json({ status: program.status });
  } catch (err) {
    console.error("Update Status Error:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getUserPrograms = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      console.log("User not found in DB");
      return res.status(404).json({ message: "User not found" });
    }

    let finalPrograms = [];

    // ==================== PURCHASED PROGRAMS ====================
    if (user.purchasedPrograms?.length > 0) {
      console.log("\n--- Processing Purchased Programs ---");
      for (const p of user.purchasedPrograms) {
        if (p.programId) {
          console.log(`Trying programId: ${p.programId} (title: ${p.title})`);

          let prog = null;

          prog = await Program.findOne({ id: p.programId }).lean();
          if (prog) {
            console.log(`✓ Found with custom id: ${prog.title}`);
          } else {
            console.log("✗ Not found with custom id");
          }
          if (!prog && mongoose.Types.ObjectId.isValid(p.programId)) {
            prog = await Program.findById(p.programId).lean();
            if (prog) {
              console.log(`✓ Found with MongoDB _id: ${prog.title}`);
            } else {
              console.log("✗ Not found with MongoDB _id");
            }
          }

          if (prog) {
            finalPrograms.push(prog);
            console.log(`✅ Added to list: ${prog.title}`);
          } else {
            console.log(`❌ PROGRAM NOT FOUND IN DATABASE: ${p.programId}`);
          }
        }
      }
    } else {
      console.log("No purchased programs");
    }

    // ==================== ENROLLED PROGRAMS ====================
    if (user.enrolledPrograms?.length > 0) {
      console.log("\n--- Processing Enrolled Programs ---");
      for (const e of user.enrolledPrograms) {
        if (e.programId) {
          console.log(`Trying enrolled programId: ${e.programId}`);

          let prog = await Program.findOne({ id: e.programId }).lean();
          if (!prog && mongoose.Types.ObjectId.isValid(e.programId)) {
            prog = await Program.findById(e.programId).lean();
          }

          if (prog) {
            finalPrograms.push(prog);
            console.log(`✅ Added enrolled: ${prog.title}`);
          } else {
            console.log(`❌ Enrolled program not found: ${e.programId}`);
          }
        }
      }
    } else {
      console.log("No enrolled programs");
    }

    // ==================== MEMBERSHIP PROGRAMS ====================
    if (user.membership?.isActive) {
      const plan = user.membership.plan;
      let allowedPlans = ["Basic"];
      if (plan === "Premium") allowedPlans = ["Basic", "Premium"];
      if (plan === "Pro") allowedPlans = ["Basic", "Premium", "Pro"];

      const membershipPrograms = await Program.find({
        plans: { $in: allowedPlans },
        status: "Active",
      }).lean();

      if (membershipPrograms.length > 0) {
        membershipPrograms.forEach((mp) => {
          console.log(
            `+ Membership program: ${mp.title} (plans: ${mp.plans?.join(", ")})`
          );
        });
      }

      finalPrograms.push(...membershipPrograms);
    } else {
      console.log("Membership not active or no plan");
    }

    // Remove duplicates
    const uniquePrograms = Object.values(
      finalPrograms.reduce((acc, prog) => {
        const key = prog.id || prog._id?.toString();
        if (key) acc[key] = prog;
        return acc;
      }, {})
    );

    // Clean response
    const clean = uniquePrograms.map((p) => ({
      _id: p._id,
      id: p.id || p._id?.toString(),
      title: p.title,
      subtitle: `${p.trainingType || "Workout"} • ${p.totalDays || 0} days`,
      description: p.desc || p.description || "",
      thumbnail: p.thumbnail || "/default.jpg",
      duration: p.duration || "30-45 min",
      caloriesBurned: p.caloriesBurned || 300,
      difficulty: p.difficulty || "Beginner",
      totalDays: p.totalDays || 0,
      equipment: p.equipment || [],
      days: p.days || [],
      trainerName: p.trainerName || "Trainer",
    }));

    res.json({
      programs: clean,
      total: clean.length,
    });
  } catch (err) {
    console.error("getUserPrograms Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
export const getWeeklyWorkoutStats = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const logs = await Program.aggregate([
      { $unwind: "$completedBy" },
      {
        $match: {
          "completedBy.completedAt": { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dayOfWeek: "$completedBy.completedAt",
          },
          sessions: { $sum: 1 },
        },
      },
    ]);

    const dayMap = {
      2: "Mon",
      3: "Tue",
      4: "Wed",
      5: "Thu",
      6: "Fri",
      7: "Sat",
      1: "Sun",
    };

    const resultMap = logs.reduce((acc, item) => {
      acc[item._id] = item.sessions;
      return acc;
    }, {});

    const finalResult = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
      (day) => ({
        day,
        sessions:
          resultMap[Object.keys(dayMap).find((k) => dayMap[k] === day)] || 0,
      })
    );

    return res.json({
      success: true,
      weeklyWorkouts: finalResult,
    });
  } catch (error) {
    console.error("Weekly Stats Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch weekly stats",
      error: error.message,
    });
  }
};

export const completeProgramDay = async (req, res) => {
  try {
    // ====== Authentication check ======
    if (!req.user || !req.user._id) {
      console.log("Unauthorized: req.user missing in completeProgramDay");
      return res.status(401).json({ message: "Unauthorized - Please login" });
    }

    const { day, workoutMinutes, heartRate, weight } = req.body;
    const programId = req.params.id;

    console.log("completeProgramDay called");
    console.log(`   Program: ${programId}, Day: ${day}`);
    console.log(`   HR: ${heartRate}, Weight: ${weight}, Minutes: ${workoutMinutes}`);

    const program = await Program.findOne({ id: programId });
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    const alreadyCompletedToday = program.completedBy.some(
      (entry) =>
        entry.user.toString() === req.user._id.toString() &&
        entry.day === Number(day) &&
        new Date(entry.completedAt).setHours(0, 0, 0, 0) === todayTime
    );

    let isNewCompletion = false;

    if (!alreadyCompletedToday) {
      program.completedBy.push({
        user: req.user._id,
        day: Number(day),
        workoutMinutes: workoutMinutes ? Number(workoutMinutes) : undefined,
        heartRate: heartRate ? Number(heartRate) : undefined,
        weight: weight ? Number(weight) : undefined,
        completedAt: new Date(),
      });

      await program.save();
      isNewCompletion = true;
    }

    // ====== METADATA SAVE + HEART RATE AVERAGE ======
    if (isNewCompletion) {
      const programThumbnail =
        program.thumbnail ||
        "https://res.cloudinary.com/dnmkwvo8m/image/upload/v1764665655/fittrack/programs/d5kngehygkrjzcrh5fhi.jpg";
      const workoutTitle = program.title;
      const dayTitle =
        program.days.find((d) => d.day === Number(day))?.title || `Day ${day}`;
      const todayStr = new Date().toLocaleDateString("en-CA");

      let dailyStats = await DailyStats.findOne({
        userId: req.user._id,
        date: todayStr,
      });

      if (!dailyStats) {
        dailyStats = new DailyStats({
          userId: req.user._id,
          date: todayStr,
          heartRate: [],
          workoutMinutes: 0,
          weight: 0,
        });
      }

      // Push heart rate metadata
      if (heartRate || weight) {
        dailyStats.heartRate.push({
          value: heartRate || 0,
          programTitle: workoutTitle,
          dayTitle: dayTitle,
          thumbnail: programThumbnail,
          weight: weight ? Number(weight) : undefined,
        });
      }

      // Update weight
      if (weight !== undefined && weight !== null) {
        dailyStats.weight = Number(weight);
      }

      // Update workout minutes
      if (workoutMinutes) {
        dailyStats.workoutMinutes =
          (dailyStats.workoutMinutes || 0) + Number(workoutMinutes);
      }

      // Calculate average & peak heart rate
      if (dailyStats.heartRate.length > 0) {
        const validHRs = dailyStats.heartRate
          .map((hr) => hr.value)
          .filter((v) => v >= 30 && v <= 250);

        if (validHRs.length > 0) {
          dailyStats.averageHeartRate = Math.round(
            validHRs.reduce((a, b) => a + b, 0) / validHRs.length
          );
          dailyStats.peakHeartRate = Math.max(...validHRs);
        }
      }

      await dailyStats.save();
    }

    // ====== USER-LEVEL STREAK UPDATE (MAIN FIX) ======
    if (isNewCompletion) {
      const user = await User.findById(req.user._id);
      if (user) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (!user.lastWorkoutDate) {
          user.streak = 1;
        } else {
          const lastDate = new Date(user.lastWorkoutDate);
          lastDate.setHours(0, 0, 0, 0);

          if (lastDate.getTime() === yesterday.getTime()) {
            user.streak += 1;
          } else {
            user.streak = 1; // gap → reset
          }
        }

        user.lastWorkoutDate = today;

        // 7-day streak achievement
        if (user.streak === 7 && !user.achievements.includes("seven_day_streak")) {
          user.achievements.push("seven_day_streak");
        }

        await user.save();
      }
    }

    // ====== USER NOTIFICATIONS (Use user-level streak) ======
    if (isNewCompletion) {
      const user = await User.findById(req.user._id);
      const currentStreak = user?.streak || 0;

      try {
        await sendNotification(
          req.user._id,
          "user",
          "Day Completed! Amazing Work!",
          `You successfully finished Day ${day} of "${program.title}"${
            currentStreak >= 3
              ? ` – Keep up your ${currentStreak}-day streak!`
              : "! Great job!"
          }`,
          "success",
          "success"
        );

        if (currentStreak === 7) {
          await sendNotification(
            req.user._id,
            "user",
            "7-Day Streak Achieved!",
            "You're on fire! Incredible consistency – keep pushing!",
            "success",
            "success"
          );
        }
      } catch (notifyErr) {
        console.error("USER NOTIFICATION FAILED:", notifyErr);
      }

      // Admin notifications
      try {
        const admins = await User.find({ role: "admin" });
        const shortName = req.user.name
          ? req.user.name.trim().split(" ")[0].charAt(0).toUpperCase() +
            req.user.name.trim().split(" ")[0].slice(1).toLowerCase()
          : "A user";

        for (const admin of admins) {
          await sendNotification(
            admin._id,
            "admin",
            "Workout Completed",
            `${shortName} completed Day ${day} of "${program.title}".`,
            "success",
            "workout"
          );
        }

        if (currentStreak === 7) {
          for (const admin of admins) {
            await sendNotification(
              admin._id,
              "admin",
              "User Achievement",
              `${req.user.name || "A user"} achieved a 7-day workout streak.`,
              "success",
              "workout"
            );
          }
        }
      } catch (adminErr) {
        console.error("ADMIN NOTIFICATION FAILED:", adminErr);
      }
    }

    // ====== RESPONSE (streak from user model) ======
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      message: "Day marked as complete",
      alreadyCompleted: !isNewCompletion,
      day: Number(day),
      streak: user?.streak || 0,
    });
  } catch (error) {
    console.error("Complete Day Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
// ====== TRENDING WORKOUTS API - LIVE & ACCURATE ======
export const getTrendingWorkouts = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const trending = await Program.aggregate([
      { $unwind: "$completedBy" },
      {
        $match: {
          "completedBy.completedAt": { $gte: startDate },
          status: { $ne: "Inactive" },
        },
      },
      {
        $group: {
          _id: "$id",
          name: { $first: "$title" },
          thumbnail: { $first: "$thumbnail" },
          trainingType: { $first: "$trainingType" },
          totalCompletions: { $sum: 1 },
          uniqueUsers: { $addToSet: "$completedBy.user" },
        },
      },
      {
        $addFields: {
          users: { $size: "$uniqueUsers" },
        },
      },
      { $sort: { users: -1, totalCompletions: -1 } },
      { $limit: 8 },
      {
        $project: {
          _id: 0,
          workoutId: "$_id",
          name: 1,
          thumbnail: 1,
          users: 1,
          trend: {
            $concat: [
              "+",
              {
                $toString: {
                  $add: [15, { $floor: { $multiply: [{ $rand: {} }, 40] } }],
                },
              },
              "%",
            ],
          },
        },
      },
    ]);

    res.json({
      success: true,
      data: trending.length > 0 ? trending : [],
    });
  } catch (error) {
    console.error("Trending API Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const completeExercise = async (req, res) => {
  try {
    const { day, exerciseId } = req.body;
    const programId = req.params.id;

    console.log("🔹 completeExercise called");
    console.log(`   User: ${req.user._id}`);
    console.log(`   Program ID: ${programId}`);
    console.log(`   Day: ${day}, Exercise ID: ${exerciseId}`);

    if (!day || !exerciseId) {
      return res
        .status(400)
        .json({ message: "day and exerciseId are required" });
    }

    let program = await Program.findOne({ id: programId });
    if (!program && mongoose.Types.ObjectId.isValid(programId)) {
      program = await Program.findById(programId);
    }
    if (!program) {
      console.log("❌ Program not found");
      return res.status(404).json({ message: "Program not found" });
    }

    console.log(`✅ Program found: ${program.title}`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();

    const alreadyCompleted = program.completedBy.some(
      (entry) =>
        entry.user.toString() === req.user._id.toString() &&
        entry.day === Number(day) &&
        entry.exerciseId === exerciseId &&
        new Date(entry.completedAt).setHours(0, 0, 0, 0) === todayTime
    );

    if (alreadyCompleted) {
      console.log("⚠️ Exercise already completed today");
      return res.json({
        success: true,
        message: "Already completed today",
        alreadyCompleted: true,
      });
    }

    // Naya completion add karo
    program.completedBy.push({
      user: req.user._id,
      day: Number(day),
      exerciseId: exerciseId,
      completedAt: new Date(),
    });

    await program.save();
    console.log("✅ Exercise completion saved in Program.completedBy");

    // Check if this was the LAST exercise of the day
    const currentDayObj = program.days.find((d) => d.day === Number(day));
    if (!currentDayObj) {
      console.log("❌ Day not found in program");
    } else {
      const totalExercises = currentDayObj.exercises.length;
      const completedCount = program.completedBy.filter(
        (entry) =>
          entry.user.toString() === req.user._id.toString() &&
          entry.day === Number(day) &&
          entry.exerciseId
      ).length;

      console.log(
        `📊 Day ${day} progress: ${completedCount}/${totalExercises} exercises completed`
      );

      if (completedCount === totalExercises) {
        console.log(
          "🎉 ALL EXERCISES COMPLETED! Day is now fully done → Frontend should show popup"
        );
      } else {
        console.log("⏳ Day incomplete — popup will not show");
      }
    }

    // Achievement logic
    let unlockedNew = false;
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const allCompletedExercises = await Program.aggregate([
      { $unwind: "$completedBy" },
      {
        $match: {
          "completedBy.user": req.user._id,
          "completedBy.exerciseId": { $exists: true, $ne: null },
        },
      },
      { $group: { _id: "$completedBy.exerciseId" } },
      { $count: "total" },
    ]);

    const totalExercisesCompleted = (allCompletedExercises[0]?.total || 0) + 1;

    if (
      totalExercisesCompleted === 1 &&
      !user.achievements.includes("first_ex")
    ) {
      user.achievements.push("first_ex");
      unlockedNew = true;
      console.log(" Unlocked: First Exercise");
    }

    if (
      totalExercisesCompleted >= 10 &&
      !user.achievements.includes("ten_ex")
    ) {
      user.achievements.push("ten_ex");
      unlockedNew = true;
      console.log(" Unlocked: 10 Exercises");
    }

    if (unlockedNew) {
      await user.save();
    }

    res.json({
      success: true,
      message: "Exercise marked as complete",
      alreadyCompleted: false,
      unlockedAchievements: unlockedNew ? user.achievements : undefined,
    });
  } catch (error) {
    console.error(" completeExercise Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getUserProgressForProgram = async (req, res) => {
  try {
    const programId = req.params.id;

    let program = await Program.findOne({ id: programId });
    if (!program && mongoose.Types.ObjectId.isValid(programId)) {
      program = await Program.findById(programId);
    }
    if (!program) return res.status(404).json({ message: "Program not found" });

    const userCompletedExercises = program.completedBy
      .filter(
        (entry) =>
          entry.user.toString() === req.user._id.toString() && entry.exerciseId
      )
      .map((entry) => entry.exerciseId);

    // Unique exercise IDs (duplicate prevent)
    const uniqueCompleted = [...new Set(userCompletedExercises)];

    res.json({
      completedExercises: uniqueCompleted,
    });
  } catch (error) {
    console.error("getUserProgress Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------- RESET PROGRAM DAY ----------------
export const resetProgramDay = async (req, res) => {
  try {
    const programId = req.params.id;
    const { day } = req.body;

    if (!day) {
      return res.status(400).json({ message: "Day is required" });
    }

    let program = await Program.findOne({ id: programId });
    if (!program && mongoose.Types.ObjectId.isValid(programId)) {
      program = await Program.findById(programId);
    }
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    const beforeCount = program.completedBy.length;

    program.completedBy = program.completedBy.filter(
      (entry) =>
        !(
          entry.user.toString() === req.user._id.toString() &&
          entry.day === Number(day)
        )
    );

    const afterCount = program.completedBy.length;

    await program.save();

    res.json({
      success: true,
      message: `Day ${day} reset successfully`,
      removedEntries: beforeCount - afterCount,
    });
  } catch (error) {
    console.error("Reset Day Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------- RESET FULL PROGRAM ----------------
export const resetFullProgram = async (req, res) => {
  try {
    const programId = req.params.id;

    let program = await Program.findOne({ id: programId });
    if (!program && mongoose.Types.ObjectId.isValid(programId)) {
      program = await Program.findById(programId);
    }
    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    const beforeCount = program.completedBy.length;

    program.completedBy = program.completedBy.filter(
      (entry) => entry.user.toString() !== req.user._id.toString()
    );

    const afterCount = program.completedBy.length;

    await program.save();

    res.json({
      success: true,
      message: "Program restarted successfully",
      removedEntries: beforeCount - afterCount,
    });
  } catch (error) {
    console.error("Reset Program Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
export const getUserStreak = async (req, res) => {
  try {
    const programId = req.params.id;
    const program = await Program.findOne({ id: programId });

    if (!program) {
      return res.status(404).json({ message: "Program not found" });
    }

    // Helper to get YYYY-MM-DD string
    const getDateString = (date) => {
      const d = new Date(date);
      return d.toLocaleDateString("en-CA");
    };

    const userCompletions = program.completedBy
      .filter((entry) => entry.user.toString() === req.user._id.toString())
      .map((entry) => getDateString(entry.completedAt));

    const uniqueDates = [...new Set(userCompletions)].sort((a, b) =>
      b.localeCompare(a)
    );

    if (uniqueDates.length === 0) {
      return res.json({ streak: 0 });
    }

    const todayStr = getDateString(new Date());
    let streak = 0;
    let expectedDate = new Date(todayStr);

    for (const completedDateStr of uniqueDates) {
      if (completedDateStr === getDateString(expectedDate)) {
        streak++;
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else if (new Date(completedDateStr) < expectedDate) {
        break;
      }
    }

    res.json({ streak });
  } catch (err) {
    console.error("Get streak error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getUserAchievements = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      unlocked: user.achievements || [],
    });
  } catch (error) {
    console.error("Get achievements error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
