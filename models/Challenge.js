// models/Challenge.js

import mongoose from "mongoose";

const StepSchema = new mongoose.Schema({
  type: { type: String, enum: ["time", "reps"], required: true },
  name: { type: String, required: true },
  duration: { type: Number },
  reps: { type: Number },
  image: { type: String },
  calories: { type: Number, default: 0 },
});

const DaySchema = new mongoose.Schema({
  title: { type: String, required: true },
  steps: [StepSchema],
  totalTime: { type: Number, default: 0 },
  totalCalories: { type: Number, default: 0 },
});

const ChallengeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  thumbnail: { type: String },
  categories: { type: [String], default: [] },
  difficulty: { 
    type: String, 
    enum: ["Beginner", "Intermediate", "Advanced"], 
    default: "Beginner" 
  },
  equipment: { type: [String], default: [] },
  totalDays: { type: Number, default: 0 },
  totalTime: { type: Number, default: 0 },
  totalCalories: { type: Number, default: 0 },
  days: [DaySchema],
  price: { type: Number, default: 0 },
  plans: { type: [String], default: [] },
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
  },
  completedBy: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      totalMinutes: { type: Number },
      caloriesBurned: { type: Number },
      completedAt: { type: Date, default: Date.now },
    },
  ],
}, { timestamps: true });

// ChallengeProgress Schema
const challengeProgressSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  challengeId: { type: mongoose.Schema.Types.ObjectId, ref: "Challenge", required: true },
  completedExercises: [{ type: String }], // exercise _id as string
  lastCompletedDate: { type: Date },
  streak: { type: Number, default: 0 },
  achievements: [{ type: String }],
}, { timestamps: true });

challengeProgressSchema.index({ user: 1, challengeId: 1 }, { unique: true });

// Create models
const Challenge = mongoose.model("Challenge", ChallengeSchema);
const ChallengeProgress = mongoose.model("ChallengeProgress", challengeProgressSchema);

// Export both
export default Challenge;                   
export { Challenge, ChallengeProgress };    