// src/routes/cartRoutes.js
import express from "express";
import {
  getCart,
  addToCart,
  increaseQuantity,
  removeFromCart,     
  updateQuantity,
  removeItem,
  clearCart,
} from "../controllers/cartController.js";

import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.get("/", getCart);
router.post("/add", addToCart);
router.post("/increase", increaseQuantity);
router.post("/remove", removeFromCart);         // decrease quantity
router.post("/update-quantity", updateQuantity);
router.post("/remove-item", removeItem);        // poora item delete
router.post("/clear", clearCart);

export default router;