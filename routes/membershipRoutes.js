// routes/membershipRoutes.js
import express from "express";
import {
  createMembership,
  getMemberships,
  getMembershipById,
  updateMembership,
  deleteMembership,
  assignMembershipToUser,
  getUserAvailablePrograms,
} from "../controllers/membershipController.js";

import { protect, adminprotect } from "../middleware/auth.js";

const router = express.Router();

// ==================== PUBLIC ROUTES (No Login Required) ====================
router.get("/", getMemberships);                    // Sabko dikhe memberships
router.get("/:id", getMembershipById);              // Single plan detail
router.get("/user/:userId/programs", protect, getUserAvailablePrograms); // User ke available programs (login chahiye)

// ==================== ADMIN ONLY ROUTES (Login + Admin Required) ====================
router.post("/", protect, adminprotect, createMembership);           // Naya membership banao
router.put("/:id", protect, adminprotect, updateMembership);         // Edit membership
router.delete("/:id", protect, adminprotect, deleteMembership);      // Delete membership

router.post("/assign", protect, adminprotect, assignMembershipToUser);

export default router;