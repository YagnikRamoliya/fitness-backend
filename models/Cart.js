// models/Cart.js
import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ["program", "class","challenge", "nutrition"], 
  },
  title: { type: String, required: true },
  desc: { type: String, default: "No description available" },
  
  image: { type: String, default: "/placeholder-program.jpg" },
  
  price: { type: Number, required: true },
  quantity: { type: Number, default: 1 },

  duration: { type: String, default: "4-8 Weeks" },
  difficulty: { type: String, default: "All Levels" },
  trainerName: { type: String, default: "Self-Guided" },
  
  level: { type: String },
}, { _id: false }); 

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [cartItemSchema],

    totalAmount: { type: Number, default: 0 },
    itemCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

cartSchema.pre("save", async function () {
  this.itemCount = this.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  this.totalAmount = this.items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
});

export default mongoose.model("Cart", cartSchema);