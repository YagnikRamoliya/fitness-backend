import mongoose from "mongoose";

const scheduleEventSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    
    title: { type: String, required: true },
    description: { type: String },
    
    date: { type: String, required: true },
    startTime: { type: String },
    endTime: { type: String },
    
    completed: { type: Boolean, default: false },

    programId: { type: String },                   
    challengeId: { type: mongoose.Schema.Types.ObjectId, ref: "Challenge" },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class" },

    source: {
      type: String,
      enum: ["manual", "program", "challenge", "class"],
      default: "manual"
    },

    // Optional: thumbnail from program/challenge/class
    thumbnail: { type: String },
  },
  { timestamps: true }
);

// Indexes for super fast queries
scheduleEventSchema.index({ userId: 1, date: 1 });
scheduleEventSchema.index({ programId: 1 });
scheduleEventSchema.index({ challengeId: 1 });
scheduleEventSchema.index({ classId: 1 });

export default mongoose.model("ScheduleEvent", scheduleEventSchema);