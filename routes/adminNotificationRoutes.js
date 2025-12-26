// routes/adminNotificationRoutes.js  (naya file)

import express from "express";
import {
  getNotifications,
  markAllRead,
  markAsRead,
  deleteNotification,
} from "../controllers/notificationController.js";
import { protect, adminprotect } from "../middleware/auth.js";

const router = express.Router();

// Admin only – extra safety
router.use(protect);
router.use(adminprotect("admin"));

router.get("/", getNotifications);
router.put("/read-all", markAllRead);
router.put("/:id/read", markAsRead);
router.delete("/:id", deleteNotification);

export default router;