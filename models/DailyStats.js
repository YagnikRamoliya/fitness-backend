import mongoose from "mongoose";

const heartRateEntrySchema = new mongoose.Schema({
  value: { type: Number, required: true },
  programTitle: { type: String, default: "Workout" },
  dayTitle: { type: String },
  thumbnail: { type: String },
  weight: { type: Number },
});

const goalSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
});

const dailyStatsSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: { type: String, required: true }, // "YYYY-MM-DD"

    calories: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fats: { type: Number, default: 0 },
    water: { type: Number, default: 0 }, // number of 250ml glasses
    steps: { type: Number, default: 0 },
    workoutMinutes: { type: Number, default: 0 },

    heartRate: [heartRateEntrySchema],
    averageHeartRate: { type: Number, default: 78 },
    peakHeartRate: { type: Number, default: null },

    weight: { type: Number, default: 0 },

    dailyGoals: [goalSchema],

    completedMeals: [
      {
        type: mongoose.Schema.Types.ObjectId,
      },
    ],
  },
  { timestamps: true }
);

dailyStatsSchema.index({ userId: 1, date: 1 }, { unique: true });

export default mongoose.model("DailyStats", dailyStatsSchema);
