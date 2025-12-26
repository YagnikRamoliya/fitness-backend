// backend/models/Settings.js

import mongoose from "mongoose";

const floatingIconSchema = new mongoose.Schema({
  icon: {
    type: String,
    enum: ["Mail", "Phone", "MapPin", "Users", "Star", "HeartPulse"],
    required: true,
  },
  x: { type: String, required: true },     // e.g., "10%"
  y: { type: String, required: true },     // e.g., "30%"
  delay: { type: Number, required: true }, // e.g., 0, 1, 1.5
});

const settingsSchema = new mongoose.Schema({
  logo: { type: String, default: null },           // Cloudinary URL
  address: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  mapEmbed: { type: String, default: "" },
  floatingIcons: [floatingIconSchema],
});
const Settings = mongoose.model("Settings", settingsSchema);

export default Settings;