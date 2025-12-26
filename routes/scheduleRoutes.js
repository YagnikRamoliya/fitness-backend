// routes/scheduleRoutes.js

import express from "express";
import {
  getMemberSchedule,
  getAdminSchedule,
  createScheduleEvent,
  updateScheduleEvent,
  deleteScheduleEvent,
  markEventCompleted,
  deleteEventsBySource,
} from "../controllers/scheduleController.js";

import { protect, adminprotect } from "../middleware/auth.js";

const router = express.Router();

// ✅ CORRECT — adminprotect("admin") call करो
router.route("/admin").get(protect, adminprotect("admin"), getAdminSchedule);

router.route("/").get(protect, getMemberSchedule);

router.route("/").post(protect, adminprotect("admin"), createScheduleEvent);
router.route("/:id").put(protect, updateScheduleEvent);
router.route("/:id").delete(protect, deleteScheduleEvent);
router.route("/:id/complete").patch(protect, markEventCompleted);

router
  .route("/source/:sourceType/:sourceId")
  .delete(protect, adminprotect("admin"), deleteEventsBySource);

export default router;