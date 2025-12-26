// routes/programRoutes.js
import express from "express";
import {
  createProgram,
  updateProgram,
  getPrograms,
  getUserProgressForProgram,
  completeExercise,
  getProgramById,
  getProgramDay,
  deleteProgram,
  updateProgramStatus,
  getUserPrograms,
  completeProgramDay,
  getWeeklyWorkoutStats,
  getTrendingWorkouts,
  resetProgramDay,
  resetFullProgram,
  getUserStreak,
  getUserAchievements,
} from "../controllers/programController.js";

import { protect, adminprotect } from "../middleware/auth.js";
import { uploadProgramThumbnail } from "../middleware/uploadMiddleware.js";

const router = express.Router();

// ====================== PUBLIC ROUTES ======================
router.get("/", getPrograms);
router.get("/trending", getTrendingWorkouts);
router.get("/weekly-stats", getWeeklyWorkoutStats);

// ====================== AUTHENTICATED USER ROUTES ======================
router.get("/user", protect, getUserPrograms);
router.get('/achievements', protect, getUserAchievements);

router.get("/:id", getProgramById);
router.get("/:id/day/:day", getProgramDay);

router.get("/:id/progress", protect, getUserProgressForProgram);
router.get("/:id/streak", protect, getUserStreak);
router.post("/:id/complete-exercise", protect, completeExercise);
router.post("/:id/complete-day", protect, completeProgramDay);     
router.post("/:id/reset-day", protect, resetProgramDay);
router.post("/:id/reset-program", protect, resetFullProgram);

// ====================== ADMIN ROUTES ======================
router.post("/",  uploadProgramThumbnail, createProgram);
router.put("/:id",  uploadProgramThumbnail, updateProgram);
router.delete("/:id",  deleteProgram);
router.patch("/:id/status", updateProgramStatus);

export default router;