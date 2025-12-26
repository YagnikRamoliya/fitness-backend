// controllers/cartController.js
import Cart from "../models/Cart.js";

// Get cart
export const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user.id });
    if (!cart) {
      return res.status(200).json({ items: [], userId: req.user._id });
    }
    res.status(200).json(cart);
  } catch (err) {
    console.error("getCart error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Add to cart
export const addToCart = async (req, res) => {
  try {
    console.log(" addToCart API hit");

    const { item } = req.body;
    console.log(" Item received:", item);

    console.log(" User ID from token:", req.user?.id || req.user?._id);

    let cart = await Cart.findOne({ userId: req.user.id });
    console.log("Existing cart:", cart);

    if (!cart) {
      console.log(" Cart not found, creating new cart");

      cart = new Cart({
        userId: req.user._id,
        items: [{ ...item, quantity: item.quantity || 1 }],
      });
    } else {
      const existingIndex = cart.items.findIndex(
        (i) => i.id === item.id && i.type === item.type
      );

      console.log("Existing item index:", existingIndex);

      if (existingIndex > -1) {
        console.log(" Item already exists, increasing quantity");

        cart.items[existingIndex].quantity += item.quantity || 1;
      } else {
        console.log(" New item added to cart");

        cart.items.push({ ...item, quantity: item.quantity || 1 });
      }
    }

    await cart.save();
    console.log("cart saved successfully:", cart);

    res.status(200).json(cart);
  } catch (err) {
    console.error("addToCart error:", err);
    res.status(500).json({ error: err.message });
  }
};


//  INCREASE Quantity - NEW
export const increaseQuantity = async (req, res) => {
  try {
    const { id, type } = req.body;
    let cart = await Cart.findOne({ userId: req.user.id });
    
    if (!cart) return res.status(200).json({ items: [] });

    const itemIndex = cart.items.findIndex(
      (i) => i.id === id && i.type === type
    );

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity += 1;  // +1
      console.log(`Increased quantity: ${cart.items[itemIndex].title} → ${cart.items[itemIndex].quantity}`);
    }

    await cart.save();
    res.status(200).json(cart);
  } catch (err) {
    console.error("increaseQuantity error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Decrease quantity
export const removeFromCart = async (req, res) => {
  try {
    const { id, type } = req.body;
    let cart = await Cart.findOne({ userId: req.user.id });
    
    if (!cart) return res.status(200).json({ items: [] });

    const itemIndex = cart.items.findIndex(
      (i) => i.id === id && i.type === type
    );

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity -= 1; 
      console.log(`Decreased quantity: ${cart.items[itemIndex].title} → ${cart.items[itemIndex].quantity}`);
      
      // Remove if quantity 
      if (cart.items[itemIndex].quantity <= 0) {
        cart.items.splice(itemIndex, 1);
      }
    }

    await cart.save();
    res.status(200).json(cart);
  } catch (err) {
    console.error("removeFromCart error:", err);
    res.status(500).json({ error: err.message });
  }
};

//  UPDATE Quantity
export const updateQuantity = async (req, res) => {
  try {
    const { id, type, quantity } = req.body;
    let cart = await Cart.findOne({ userId: req.user.id });
    
    if (!cart) return res.status(200).json({ items: [] });

    const itemIndex = cart.items.findIndex(
      (i) => i.id === id && i.type === type
    );

    if (itemIndex > -1) {
      cart.items[itemIndex].quantity = Math.max(1, quantity);  // Minimum 1
      console.log(`Updated quantity: ${cart.items[itemIndex].title} → ${cart.items[itemIndex].quantity}`);
    }

    // Remove items with quantity 0
    cart.items = cart.items.filter((i) => i.quantity > 0);
    
    await cart.save();
    res.status(200).json(cart);
  } catch (err) {
    console.error("updateQuantity error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Remove entire item
export const removeItem = async (req, res) => {
  try {
    const { id, type } = req.body;
    let cart = await Cart.findOne({ userId: req.user.id });
    
    if (!cart) return res.status(200).json({ items: [] });

    cart.items = cart.items.filter((i) => !(i.id === id && i.type === type));
    await cart.save();
    res.status(200).json(cart);
  } catch (err) {
    console.error("removeItem error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Clear cart
export const clearCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user.id });
    
    if (cart) {
      cart.items = [];
      await cart.save();
    }
    
    res.status(200).json({ items: [] });
  } catch (err) {
    console.error("clearCart error:", err);
    res.status(500).json({ error: err.message });
  }
};