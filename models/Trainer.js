import mongoose from "mongoose";

const trainerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    phone: { type: String },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    workout: { type: String },
    avatar: { type: String },
    bio: { type: String },
    role: { type: String, default: "Trainer" },
    specialties: [{ type: String }],
    img: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Trainer", trainerSchema);
