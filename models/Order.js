// models/Order.js
import mongoose from "mongoose";
import Cart from "../models/Cart.js";
const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    guestEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    userDetails: {
      name: { type: String, required: true },
      email: { type: String, required: true, lowercase: true, trim: true },
      phone: { type: String },
      address: { type: String },
      city: { type: String },
      country: { type: String },
    },
    cardDetails: {
      last4: { type: String, required: true },
      nameOnCard: { type: String },
      expiry: { type: String },
    },
    programs: [
      {
        title: { type: String, required: true },
        price: { type: Number, required: true },
        type: {
          type: String,
          enum: ["program", "class", "challenge", "nutrition", "membership"],
          default: "program",
        },
        itemId: {
          type: mongoose.Schema.Types.Mixed,
        },
      },
    ],
    total: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ["Pending", "Completed", "Failed", "Refunded"],
      default: "Completed",
    },
    paymentMethod: {
      type: String,
      default: "card",
    },
    isMembershipPurchase: {
      type: Boolean,
      default: false,
    },
    membershipInfo: {
      _id: mongoose.Schema.Types.ObjectId,
      plan: String,
      price: Number,
      duration: String,
      features: [String],
      startedAt: Date,
      expiresAt: Date,
      isActive: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
