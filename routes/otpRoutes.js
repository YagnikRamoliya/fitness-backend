// routes/otpRoutes.js
import express from "express";
import { sendOtp, verifyOtpAndSaveOrder } from "../controllers/otpController.js";
import { protect } from "../middleware/auth.js";
const router = express.Router();

router.post("/send", sendOtp);
router.post("/verify", protect, verifyOtpAndSaveOrder);

export default router;