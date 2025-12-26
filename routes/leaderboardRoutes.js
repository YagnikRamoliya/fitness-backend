// routes/leaderboard.routes.js

import express from "express";
import { 
  getLeaderboard,           // existing: last 14 days leaderboard
  getMonthlyTopPerformer    // NEW: current month ka top performer
} from "../controllers/leaderboardController.js"; 
import { protect } from "../middleware/auth.js"; 

const router = express.Router();

router.route("/").get(protect, getLeaderboard);

router.route("/monthly-top").get(protect, getMonthlyTopPerformer); 


export default router;