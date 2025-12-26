import express from "express";
import {
  createTrainer,
  updateTrainer,
  deleteTrainer,
  getTrainers,
  getTrainerById,
  updateTrainerStatus,
} from "../controllers/trainerController.js";

import multer from "multer";

const router = express.Router();

const upload = multer({ dest: "uploads/" });

// CREATE
router.post("/", upload.single("img"), createTrainer);

// UPDATE
router.put("/:id", upload.single("img"), updateTrainer);

// DELETE
router.delete("/:id", deleteTrainer);
router.patch("/:id/status", updateTrainerStatus);

router.get("/", getTrainers);

// GET SINGLE
router.get("/:id", getTrainerById);

export default router;
