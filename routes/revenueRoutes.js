// routes/revenueRoutes.js → FULLY FIXED & SECURE VERSION

import express from "express";
import {
  getTotalRevenue,
  getRevenuePerformance,
  getMonthlyOverview,
  getMembershipSummary,
  getPlanDistribution,
  getTransactions,
  getMembershipUsers,
  getRevenueReport,
  getTodayRevenue,
  getLast7DaysRevenue,
} from "../controllers/revenueController.js";

import { protect, adminprotect } from "../middleware/auth.js";

const router = express.Router();

// ====================== ADMIN ONLY ROUTES ======================

router.get("/total", protect, adminprotect("admin"), getTotalRevenue);
router.get("/performance", protect, adminprotect("admin"), getRevenuePerformance);
router.get("/monthly-overview", protect, adminprotect("admin"), getMonthlyOverview);
router.get("/membership/summary", protect, adminprotect("admin"), getMembershipSummary);
router.get("/membership/distribution", protect, adminprotect("admin"), getPlanDistribution);
router.get("/transactions", protect, adminprotect("admin"), getTransactions);
router.get("/membership/users", protect, adminprotect("admin"), getMembershipUsers);
router.get("/report", protect, adminprotect("admin"), getRevenueReport);
router.get("/today", protect, adminprotect("admin"), getTodayRevenue);
router.get("/last-7-days", protect, adminprotect("admin"), getLast7DaysRevenue);

export default router;