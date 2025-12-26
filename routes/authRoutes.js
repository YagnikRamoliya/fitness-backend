
import express from "express";
import { 
  signup, 
  login, 
  logout, 
  me, 
  updateProfile, 
  updatePassword, 
  updatePreferences,
  getUserPrograms,
  getUserProgress,
  saveUserProgress
} from "../controllers/authController.js";

import { protect } from "../middleware/auth.js";  
import cloudinary from "../config/cloudinary.js";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";

const router = express.Router();

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "profile_photos",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 400, height: 400, crop: "fill", gravity: "face" },
      { quality: "auto", fetch_format: "auto" },
    ],
  },
});
const upload = multer({ storage });

// ========================
// PUBLIC ROUTES
// ========================
router.post("/signup", upload.single("avatar"), signup);
router.post("/login", login);
router.post("/logout", logout); 

// ========================
// PROTECTED USER ROUTES
// ========================
router.get("/me", protect, me);
router.put("/me", protect, upload.single("avatar"), updateProfile);
router.put("/password", protect, updatePassword);
router.put("/preferences", protect, updatePreferences);

router.get("/programs", protect, getUserPrograms);
router.get("/progress", protect, getUserProgress);
router.post("/progress", protect, saveUserProgress);

export default router;