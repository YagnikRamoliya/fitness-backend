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
router.post(
  "/create",
  adminprotect,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "data" }, // JSON data field को allow करता है
    { name: /^step-\d+-\d+$/, maxCount: 100 }, // step-0-0, step-1-3 जैसे सभी fields accept करता है
  ]),
  createChallenge
);

router.put(
  "/:id",
  adminprotect,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "data" },
    { name: /^step-\d+-\d+$/, maxCount: 100 },
  ]),
  updateChallenge
);
router.delete("/:id", adminprotect, deleteChallenge);

router.patch("/:id/complete", protect, completeChallenge);
export default router;
