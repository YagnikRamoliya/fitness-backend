import User from "../models/User.js";
import Program from "../models/Program.js";
import Challenge from "../models/Challenge.js";

export const getLeaderboard = async (req, res) => {
  try {
    // YE FUNCTION ADD KARO (andar hi)
    const getActivityArray = (dates = []) => {
      const activity = Array(14).fill(0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      dates.forEach((date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((today - d) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 14) {
          activity[13 - diffDays] = 1; // index 13 = today
        }
      });
      return activity;
    };

    const users = await User.find({}).select("_id name avatar").lean();

    if (users.length === 0) return res.json([]);

    const today = new Date();
    const fourteenDaysAgo = new Date(today);
    fourteenDaysAgo.setDate(today.getDate() - 13);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    // Program completions
    const programCompletions = await Program.aggregate([
      { $unwind: { path: "$completedBy", preserveNullAndEmptyArrays: true } },
      { $match: { "completedBy.completedAt": { $gte: fourteenDaysAgo } } },
      {
        $group: {
          _id: "$completedBy.user",
          workouts: { $sum: 1 },
          totalMinutes: {
            $sum: { $ifNull: ["$completedBy.workoutMinutes", 0] },
          },
          activityDates: { $push: "$completedBy.completedAt" },
        },
      },
    ]);

    const progMap = {};
    programCompletions.forEach((p) => {
      if (p._id) progMap[p._id.toString()] = p;
    });

    // Challenges completion
    const challengeCompletions = await Challenge.aggregate([
      { $unwind: "$completedBy" },
      { $match: { "completedBy.completedAt": { $gte: fourteenDaysAgo } } },
      {
        $group: {
          _id: "$completedBy.user",
          challenges: { $sum: 1 },
        },
      },
    ]);

    const challengeMap = {};
    challengeCompletions.forEach((c) => {
      if (c._id) {
        const uid = c._id.toString();
        challengeMap[uid] = (challengeMap[uid] || 0) + c.challenges;
      }
    });

    // Build leaderboard
    const leaderboard = users.map((user) => {
      const userId = user._id.toString();
      const prog = progMap[userId] || {};

      return {
        id: userId,
        name: user.name || "Member",
        avatar: user.avatar || `https://i.pravatar.cc/150?u=${userId}`,
        workouts: prog.workouts || 0,
        challenges: challengeMap[userId] || 0,
        calories: Math.round((prog.totalMinutes || 0) * 8),
        hours: Math.round((prog.totalMinutes || 0) / 60),
        activity: getActivityArray(prog.activityDates), // ab defined hai!
      };
    });

    // Sort & rank
    leaderboard.sort((a, b) => {
      if (b.workouts !== a.workouts) return b.workouts - a.workouts;
      if (b.challenges !== a.challenges) return b.challenges - a.challenges;
      return b.calories - a.calories;
    });

    const ranked = leaderboard.map((item, i) => ({ ...item, rank: i + 1 }));

    res.json(ranked);
  } catch (error) {
    console.error("Leaderboard Error:", error);
    res.status(500).json({ message: "Failed to generate leaderboard" });
  }
};

// /api/admin/leaderboard/monthly-top
export const getMonthlyTopPerformer = async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);

    // Same logic as leaderboard but for current month
    const programCompletions = await Program.aggregate([
      { $unwind: { path: "$completedBy", preserveNullAndEmptyArrays: true } },
      { 
        $match: { 
          "completedBy.completedAt": { 
            $gte: startOfMonth, 
            $lte: endOfMonth 
          } 
        } 
      },
      {
        $group: {
          _id: "$completedBy.user",
          workouts: { $sum: 1 },
          totalMinutes: { $sum: { $ifNull: ["$completedBy.workoutMinutes", 0] } },
        },
      },
    ]);

    const challengeCompletions = await Challenge.aggregate([
      { $unwind: "$completedBy" },
      { 
        $match: { 
          "completedBy.completedAt": { 
            $gte: startOfMonth, 
            $lte: endOfMonth 
          } 
        } 
      },
      {
        $group: {
          _id: "$completedBy.user",
          challenges: { $sum: 1 },
        },
      },
    ]);

    // Maps banao
    const progMap = {};
    programCompletions.forEach(p => {
      if (p._id) progMap[p._id.toString()] = p;
    });

    const challengeMap = {};
    challengeCompletions.forEach(c => {
      if (c._id) {
        const uid = c._id.toString();
        challengeMap[uid] = (challengeMap[uid] || 0) + c.challenges;
      }
    });

    // Sab users lo (ya top 50 bhi chalega)
    const users = await User.find({}).select("_id name avatar").lean();

    const leaderboard = users.map(user => {
      const userId = user._id.toString();
      const prog = progMap[userId] || {};

      return {
        id: userId,
        name: user.name || "Member",
        avatar: user.avatar || `https://i.pravatar.cc/150?u=${userId}`,
        workouts: prog.workouts || 0,
        challenges: challengeMap[userId] || 0,
        calories: Math.round((prog.totalMinutes || 0) * 8),
      };
    }).filter(u => u.workouts > 0 || u.challenges > 0); // sirf active users

    // Sort by workouts → challenges → calories
    leaderboard.sort((a, b) => {
      if (b.workouts !== a.workouts) return b.workouts - a.workouts;
      if (b.challenges !== a.challenges) return b.challenges - a.challenges;
      return b.calories - a.calories;
    });

    const topPerformer = leaderboard[0];

    if (!topPerformer) {
      return res.json({ name: "No activity yet", workouts: 0, avatar: null });
    }

    res.json({
      name: topPerformer.name,
      avatar: topPerformer.avatar,
      workouts: topPerformer.workouts,
      challenges: topPerformer.challenges,
      calories: topPerformer.calories,
    });

  } catch (error) {
    console.error("Monthly Top Performer Error:", error);
    res.status(500).json({ message: "Failed" });
  }
};