// routes/adminRoutes.js → Admin Only Routes (mounted on /api/admin)

import express from "express";
import { 
  adminLogin,
  me,
  logout,
  getAllUsers,
  getUserById,
  deleteUser
} from "../controllers/authController.js";

import { protect, adminprotect } from "../middleware/auth.js";

const router = express.Router();

// ========================
// PUBLIC ADMIN ROUTE
// ========================
router.post("/login", adminLogin);

// ========================
// PROTECTED ADMIN ROUTES
// ========================
router.get("/me", protect, adminprotect("admin"), me);
router.post("/logout", protect, adminprotect("admin"), logout);

router.get("/users", protect, adminprotect("admin"), getAllUsers);
router.get("/users/:id", protect, adminprotect("admin"), getUserById);
router.delete("/users/:id", protect, adminprotect("admin"), deleteUser);

export default router;