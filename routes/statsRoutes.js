import express from "express";
import {
  getTodayStats,
  updateStatsFromMeal,
  updateWater,
  getWeeklyStats,
  getSummary,
  updateHeartRate,
  updateWorkoutMinutes,
  updateWeight,
  getTodayGoals,
  addTodayGoal,
  toggleGoalComplete,
  deleteTodayGoal,
  getLatestWorkoutSession,
  getTodaySchedule,
} from "../controllers/statsController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect); 

router.get("/today", getTodayStats);
router.get("/weekly", getWeeklyStats);
router.get("/summary", getSummary);
router.get("/latest-session", getLatestWorkoutSession);
router.get("/today-schedule", getTodaySchedule);
router.get("/today-goals", getTodayGoals);

router.post("/meal", updateStatsFromMeal);
router.post("/water", updateWater);
router.post("/heart-rate", updateHeartRate);
router.post("/workout-minutes", updateWorkoutMinutes);
router.post("/weight", updateWeight);
router.post("/add-goal", addTodayGoal);
router.post("/toggle-goal", toggleGoalComplete);
router.post("/delete-goal", deleteTodayGoal);

export default router;