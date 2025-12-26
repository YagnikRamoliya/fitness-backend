import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

import {
  createChallenge,
  updateChallenge,
  getChallenges,
  getChallengeById,
  deleteChallenge,
  getChallengeProgress,
  saveChallengeProgress,  
  getUserChallenges,
  completeChallenge,
} from "../controllers/challengeController.js";

import { protect, adminprotect } from "../middleware/auth.js";

const router = express.Router();

// ==================== CLOUDINARY CONFIG ====================

// Multer + Cloudinary Storage Setup
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "challenges", // Cloudinary folder name
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif"],
    transformation: [{ width: 1200, height: 675, crop: "limit" }], // optional resize
    public_id: (req, file) => {
      // Unique filename
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1e9);
      const originalName = file.originalname.split(".")[0];
      return `${originalName}-${timestamp}-${random}`;
    },
  },
});

const upload = multer({ storage });

// ==================== ROUTES ====================

router.get("/", getChallenges);

router.get("/user", protect, getUserChallenges); 

router.get("/:id", getChallengeById);
router.get("/:challengeId/progress", protect, getChallengeProgress);
router.post("/progress", protect, saveChallengeProgress);
router.post("/create", adminprotect, upload.any(), createChallenge);
router.put("/:id", adminprotect, upload.any(), updateChallenge);
router.delete("/:id", adminprotect, deleteChallenge);

router.patch("/:id/complete", protect, completeChallenge);
export default router;
