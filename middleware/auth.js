// middleware/protect.js (or wherever you have it)

import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    let token = null;
    let tokenSource = "none";

    // Sirf Bearer header se token lo (cookies completely ignored)
    if (req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
      tokenSource = "Bearer header";
    }

    // Agar token nahi mila
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated. Please login.",
      });
    }

    // JWT verify karo
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // User find karo
    const user = await User.findById(decoded.id)
      .select("-password -__v")
      .lean();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found or deleted.",
      });
    }

    // req.user set kar do
    req.user = {
      id: user._id.toString(),
      _id: user._id,
      role: user.role,
      name: user.name,
      email: user.email,
    };

    console.log(
      `✅ [AUTH] ${user.email} (${user.role.toUpperCase()}) via ${tokenSource} → ${req.originalUrl}`
    );

    next();
  } catch (err) {
    console.error("Token verification failed:", err.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

// Admin-only routes ke liye (unchanged — perfect hai)
export const adminprotect = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied: Admin privileges required.",
        requiredRole: allowedRoles.join(" or "),
      });
    }
    next();
  };
};
