import express from "express";
import {
  createClass,
  updateClass,
  getAllClasses,
  getClassById,
  deleteClass,
  getClassProgress,
  saveClassProgress,
  listActiveClasses,
  getUserClasses,
  toggleStatus,
} from "../controllers/classController.js";

import { protect, adminprotect } from "../middleware/auth.js";
import { uploadClassFiles } from "../middleware/uploadMiddleware.js";

const router = express.Router();

/* ===========================
   🔥 STATIC ROUTES — FIRST
=========================== */

// ✅ PUBLIC ACTIVE CLASSES
router.get("/active", listActiveClasses);

// ✅ USER CLASSES
router.get("/user", protect, getUserClasses);

// ✅ PROGRESS
router.get("/:classId/progress", protect, getClassProgress);
router.post("/progress", protect, saveClassProgress);

/* ===========================
   ADMIN ROUTES
=========================== */

router
  .route("/")
  .post(adminprotect, uploadClassFiles, createClass)
  .get(getAllClasses);

router.patch("/:id/status", toggleStatus);

/* ===========================
   ❗ DYNAMIC ROUTES — LAST
=========================== */

router
  .route("/:id")
  .get(getClassById)
  .put(uploadClassFiles, updateClass)
  .delete(deleteClass);

export default router;
