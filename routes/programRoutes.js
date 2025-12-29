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
router.post("/", (req, res, next) => {
  uploadProgramThumbnail(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      // Multer-specific error (file too large, wrong format, etc.)
      return res.status(400).json({ message: "File upload error", error: err.message });
    } else if (err) {
      // Other error (from fileFilter)
      return res.status(400).json({ message: "Invalid file", error: err.message });
    }
    next(); // No error → go to controller
  });
}, createProgram);

router.put("/:id", (req, res, next) => {
  uploadProgramThumbnail(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: "File upload error", error: err.message });
    } else if (err) {
      return res.status(400).json({ message: "Invalid file", error: err.message });
    }
    next();
  });
}, updateProgram);
router.delete("/:id",  deleteProgram);
router.patch("/:id/status", updateProgramStatus);

export default router;
