// models/BusinessGoal.js
import mongoose from "mongoose";

const goalItemSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    trim: true,
  },
  target: {
    type: Number,
    required: true,
  },
  color: {
    type: String,
    default: "#e3002a",
  },
  dataSource: {
    type: String,
    enum: ["revenue", "newMembers", "retention", "custom"],
    default: "custom",
  },
  achieved: {
    type: Number,
    default: 0,
  },
});

const businessGoalSchema = mongoose.Schema(
  {
    period: {
      type: String, // "2025-12"
      required: true,
      unique: true,
    },
    goals: [goalItemSchema],
    setBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const BusinessGoal = mongoose.model("BusinessGoal", businessGoalSchema);
export default BusinessGoal;