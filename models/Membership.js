// models/Membership.js
import mongoose from "mongoose";

const membershipSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    duration: {
      type: String,
      required: true,
      trim: true,
    },
    features: {
      type: [String],
      required: true,
      default: [],
    },
    popular: {
      type: Boolean,
      default: false,
    },
    plans: {
      type: [String],
      default: [],
      enum: ["Basic", "Premium", "Pro"],
    },

    workouts: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Program",
      default: [],
    },
   challenges: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Challenge",
      default: [],
    }, 
    classes: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Class",
      default: [],
    },
     nutritionPlans: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "NutritionPlan",
      default: [], 
    },
  },
  {
    timestamps: true,
  }
);

membershipSchema.index({ popular: -1 });
membershipSchema.index({ name: 1 });

export default mongoose.model("Membership", membershipSchema);
