// models/Program.js
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid"; 

const ExerciseSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: false,
      default: () => uuidv4(), 
    },
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: ["time", "reps"], required: true },
    time: { type: Number, default: 0 },
    reps: { type: Number, default: 0 },
    sets: { type: Number, default: 0 },
    section: {
      type: String,
      enum: ["Warm-up", "Workout", "Cool-down"],
      default: "Workout",
    },
    description: { type: String, default: "" },
    thumbnail: { type: String, default: null },
  },
  { _id: false } 
);

const DaySchema = new mongoose.Schema(
  {
    day: {
      type: Number,
      required: false,
      default: function () {
        const parent = this.parent();
        if (parent && Array.isArray(parent.days)) {
          return parent.days.indexOf(this) + 1;
        }
        return 1;
      },
    },
    title: { type: String, required: true, trim: true },
    exercises: [ExerciseSchema],
  },
  { _id: false }
);

const ProgramSchema = new mongoose.Schema(
  {
    id: { type: String, unique: true, sparse: true },

    title: { type: String, required: true, trim: true },
    desc: { type: String, required: true, trim: true },
    thumbnail: { type: String, default: null },
    duration: {
      type: String,
      enum: ["15 – 30 min", "30 – 45 min", "45 – 60 min"],
      default: "30 – 45 min",
    },
    difficulty: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced"],
      default: "Beginner",
    },
    trainingType: {
      type: String,
      enum: ["Full Body", "Upper Body", "Lower Body", "Cardio", "Strength"],
      default: "Full Body",
    },
    focus: {
      type: String,
      enum: ["General Fitness", "Fat Loss", "Muscle Gain", "Endurance"],
      default: "General Fitness",
    },
    equipment: [{ type: String }],
    price: { type: Number, default: 0 },
    trainerName: { type: String, default: "" },
    caloriesBurned: { type: Number, default: 0 },
    plans: [{ type: String, enum: ["Basic", "Premium", "Pro"] }],
    totalDays: { type: Number },

    days: [DaySchema],

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    completedBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        day: { type: Number, required: true },
        exerciseId: { type: String },
        workoutMinutes: { type: Number },
        heartRate: { type: Number },
        weight: { type: Number },
        completedAt: { type: Date, default: Date.now },
      },
    ],

    userProgress: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        completedExercises: [{ type: String }], // exercise.id strings
        completedDays: [{ type: Number }],
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
ProgramSchema.index({ "completedBy.user": 1, "completedBy.completedAt": -1 });
ProgramSchema.index({ id: 1 });
ProgramSchema.index({ "userProgress.user": 1 });

const Program = mongoose.model("Program", ProgramSchema);

export default Program;