// routes/goalRoutes.js
import express from "express";
import {
  getCurrentGoals,
  addGoal,
  updateGoal,
  deleteGoal,
  getGoalStats,
} from "../controllers/goalController.js";
import { protect, adminprotect } from "../middleware/auth.js";

const router = express.Router();
router.get("/stats",  protect, adminprotect("admin"),getGoalStats);
router.get("/current", protect, adminprotect("admin"), getCurrentGoals);
router.post("/add", protect, adminprotect("admin"), addGoal);
router.put("/update/:goalId", protect, adminprotect("admin"), updateGoal);
router.delete("/delete/:goalId",  protect, adminprotect("admin"),deleteGoal);

export default router;