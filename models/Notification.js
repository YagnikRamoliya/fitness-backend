import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, 
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: ["success", "error", "neutral"], 
    default: "neutral" 
  },
  icon: { 
    type: String, 
    enum: ["workout", "success", "error", "neutral", "bell", "activity","membership", "purchase", "calendar"],
    default: "bell"
  },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("Notification", notificationSchema);