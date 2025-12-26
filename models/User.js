import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    password: { type: String, required: true },

    phone: { type: String, required: true, trim: true },

    gender: {
      type: String,
      required: true,
      enum: ["Male", "Female", "Other"],
    },

    dob: { type: Date, required: true },

    address: { type: String, default: "" },
    avatar: { type: String, default: "" },
    lastActive: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // ================================
    // MEMBERSHIP
    // ================================
    membership: {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Membership",
      },
      plan: { type: String, default: "Free" },
      price: { type: Number, default: 0 },
      duration: { type: String, default: "" },
      features: [{ type: String }],
      startedAt: { type: Date },
      expiresAt: { type: Date },
      isActive: { type: Boolean, default: false },
    },

    // ================================
    // ASSIGNED CONTENT
    // ================================
    assignedWorkouts: [String],
    assignedChallenges: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Challenge" },
    ],
    assignedClasses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Class" }],
    assignedNutritionPlans: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "NutritionPlan" }],
      default: [],
    },
    // ================================
    // PURCHASED HISTORY
    // ================================
    purchasedPrograms: [
      {
        programId: { type: String, required: true },
        title: { type: String, required: true },
        trainerName: { type: String, default: "Trainer" },
        purchaseDate: { type: Date, default: Date.now },
        status: { type: String, default: "active" },
      },
    ],

    purchasedClasses: [
      {
        classId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Class",
          required: false,
        },
        title: { type: String, required: true },
        trainerName: { type: String, default: "Trainer" },
        purchaseDate: { type: Date, default: Date.now },
        status: { type: String, default: "active" },
      },
    ],

    purchasedChallenges: [
      {
        challengeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Challenge",
          required: false,
        },
        title: { type: String, required: true },
        trainerName: { type: String, default: "Trainer" },
        purchaseDate: { type: Date, default: Date.now },
        status: { type: String, default: "active" },
      },
    ],

    purchasedNutritionPlans: {
      type: [
        {
          planId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "NutritionPlan",
          },
          title: String,
          trainerName: String,
          purchaseDate: Date,
          status: String,
        },
      ],
      default: [], // ← MUST HAVE THIS
    },
    // === ADD THIS EXACT BLOCK ===
    enrolledPrograms: {
      type: [
        {
          programId: { type: String, required: true }, // custom string id jaise "beginner-fat-loss"
          title: { type: String, required: true },
          trainerName: { type: String, default: "Trainer" },
          enrolledAt: { type: Date, default: Date.now },
          progress: { type: Number, default: 0 }, // 0-100
          completedDays: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
    // ================================
    // HEALTH & FITNESS METRICS
    // ================================
    healthMetrics: {
      height: { type: Number, default: null },
      weight: { type: Number, default: null },
      bmi: { type: Number, default: null },
      bodyFat: { type: Number, default: null },
      medicalConditions: { type: String, default: "" },
    },

    fitnessPreferences: {
      goal: { type: String, default: "" },
      workoutType: { type: String, default: "" },
      diet: { type: String, default: "" },
      allergies: { type: String, default: "" },
    },

    // ================================
    // ACHIEVEMENTS (NEW FIELD - ADD HERE)
    // ================================
    achievements: {
      type: [String],
      default: [],
    },
    streak: {
      type: Number,
      default: 0,
    },
    lastWorkoutDate: {
      type: Date,
      default: null,
    },
    // ================================
    // TRAINER DETAILS
    // ================================
    trainer: {
      name: { type: String, default: "" },
      email: { type: String, default: "" },
      sessionsLeft: { type: Number, default: 0 },
    },
    // ================================
    // NUTRITION PLAN PROGRESS 
    // ================================
    nutritionProgress: {
      type: [
        {
          planId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "NutritionPlan",
            required: true,
          },
          completedMeals: [
            {
              mealId: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
              },
              dayIndex: { type: Number, required: true }, 
              completedAt: { type: Date, default: Date.now },
            },
          ],
        },
      ],
      default: [],
    },
    // ================================
    // NOTIFICATION SETTINGS
    // ================================
    emailNotifications: { type: Boolean, default: true },
    smsNotifications: { type: Boolean, default: true },
    accountAlerts: { type: Boolean, default: true },

    joined: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ====================================
// INDEXES
// ====================================
userSchema.index({ phone: 1 });
userSchema.index({ "membership.isActive": 1 });
userSchema.index({ joined: -1 });

export default mongoose.model("User", userSchema);
