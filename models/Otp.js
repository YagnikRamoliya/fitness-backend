// models/Otp.js
import mongoose from "mongoose";

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresIn: {
    type: Date,
    required: true,
  },
}, { timestamps: true });

// Auto-delete expired OTPs (optional but recommended)
otpSchema.index({ expiresIn: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model("Otp", otpSchema);