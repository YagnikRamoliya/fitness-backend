import Order from "../models/Order.js";
import User from "../models/User.js";
import mongoose from "mongoose";

export const createOrder = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { userDetails, cardDetails, programs = [], classes = [], total } =
      req.body;

    const formattedPrograms = programs.map((p) => ({
      title: p.title,
      price: Number(p.price) || 0,
      type: "program",
      itemId: p.programId,
    }));

    const newOrder = await Order.create({
      user: userId,
      userDetails,
      cardDetails: {
        last4: cardDetails.cardNumber.slice(-4),
        nameOnCard: cardDetails.nameOnCard,
        expiry: cardDetails.expiry,
      },
      programs: formattedPrograms,
      total: Number(total),
      status: "Completed",
    });

    const user = await User.findById(userId);

    for (const program of programs) {
      const exists = user.purchasedPrograms.some(
        (p) => p.programId === program._id
      );

      if (!exists) {
        user.purchasedPrograms.push({
          programId: program._id,
          title: program.title,
          trainerName: program.trainerName || "Trainer",
          purchaseDate: new Date(),
          status: "active",
        });
      }
    }

    await user.save();

    res.status(201).json({
      message: "Order placed successfully!",
      order: newOrder,
    });
  } catch (error) {
    console.error("ORDER SAVE FAILED:", error.message);
    res.status(500).json({ message: error.message });
  }
};
