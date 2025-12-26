// routes/settingsRoutes.js

import express from "express";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";

import {
  getSettings,
  updateSettings,
} from "../controllers/settingsController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Cloudinary Storage Configuration
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "fitness-app/logo",
    allowed_formats: ["jpeg", "jpg", "png", "gif", "webp"],
    transformation: [
      { width: 500, height: 500, crop: "limit" },
      { quality: "auto:good" },
      { fetch_format: "auto" },
    ],
    public_id: (req, file) => `logo-${Date.now()}`,
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, 
});

// Routes
router.get("/", getSettings);
router.post("/", protect, upload.single("logo"), updateSettings);

export default router;  