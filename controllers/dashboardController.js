// controllers/dashboardController.js
import UserProgress from "../models/UserProgress.js";
import User from "../models/User.js";

// Helper: Aaj ka start time
const getTodayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// 1. Today's Summary (Top 4 Cards)
export const getTodaySummary = async (req, res) => {
  try {
    const progress = await UserProgress.findOne({ userId: req.user.id });
    const user = await User.findById(req.user.id);

    const todayLog = progress?.logs.find(
      (log) => log.date >= getTodayStart()
    ) || {};

    const water = Number((todayLog.waterIntake || 0).toFixed(1));
    const stepsPercent = progress?.dailyStepGoal
      ? Math.round(((todayLog.steps || 0) / progress.dailyStepGoal) * 100)
      : 0;

    res.json({
      water,
      waterGoal: progress?.dailyWaterGoal || 3,
      waterPercent: Math.round((water / (progress?.dailyWaterGoal || 3)) * 100),

      calories: todayLog.caloriesConsumed || 2500,
      caloriesGoal: progress?.dailyCalorieGoal || 2500,
      caloriesChange: todayLog.caloriesConsumed
        ? Math.round(
            ((todayLog.caloriesConsumed || 2500) /
              (progress?.dailyCalorieGoal || 2500) -
              1) *
              100
          )
        : 10,

      steps: todayLog.steps || 0,
      stepsGoal: progress?.dailyStepGoal || 10000,
      stepsPercent,

      heartRate: todayLog.heartRateAvg || 78,
      bmi: user?.healthMetrics?.bmi?.toFixed(1) || 22.4,
      sleepHours: todayLog.sleepHours || 7.5,
    });
  } catch (err) {
    console.error("Dashboard Today Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 2. Weekly Line Chart Data
export const getWeeklyData = async (req, res) => {
  try {
    const progress = await UserProgress.findOne({ userId: req.user.id });
    const user = await User.findById(req.user.id);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let logs = (progress?.logs || [])
      .filter((log) => log.date >= sevenDaysAgo)
      .sort((a, b) => a.date - b.date)
      .slice(-7);

    // Agar 7 din nahi hain toh dummy fill kar do
    const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const filledLogs = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const log = logs.find(
        (l) =>
          new Date(l.date).toDateString() === date.toDateString()
      );
      filledLogs.push(
        log || {
          date,
          workoutMinutes: 0,
          caloriesConsumed: 2000,
          weight: user?.healthMetrics?.weight || 70.5,
          steps: 8000,
        }
      );
    }

    const weeklyData = filledLogs.map((log) => ({
      day: log.date.toLocaleDateString("en-us", { weekday: "short" }),
      workoutHours: Number((log.workoutMinutes / 60).toFixed(1)),
      calories: log.caloriesConsumed || 2200,
      weight: Number((log.weight || 70.5).toFixed(1)),
      steps: Math.round((log.steps || 8000) / 1000),
    }));

    res.json(weeklyData);
  } catch (err) {
    console.error("Weekly Data Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 3. Nutrition Weekly Bar Chart
export const getNutritionData = async (req, res) => {
  try {
    const progress = await UserProgress.findOne({ userId: req.user.id });

    const last7Logs = (progress?.logs || []).slice(-7);

    const labels = last7Logs.map((log) =>
      log.date.toLocaleDateString("en-us", { weekday: "short" })
    );

    res.json({
      labels,
      datasets: [
        {
          label: "Calories",
          data: last7Logs.map((l) => l.caloriesConsumed || 2200),
          backgroundColor: "#e3002a",
        },
        {
          label: "Proteins (g)",
          data: last7Logs.map((l) => l.protein || 120),
          backgroundColor: "#f7c1c9",
        },
        {
          label: "Fats (g)",
          data: last7Logs.map((l) => l.fat || 70),
          backgroundColor: "#e3a500",
        },
        {
          label: "Carbs (g)",
          data: last7Logs.map((l) => l.carbs || 250),
          backgroundColor: "#a0d911",
        },
      ],
    });
  } catch (err) {
    console.error("Nutrition Data Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

