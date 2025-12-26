

import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    let token = null;
    let tokenSource = "none";

    const isAdminRoute =
      req.originalUrl.startsWith("/api/admin") ||
      req.originalUrl.startsWith("/api/schedule/admin") ||  
      req.originalUrl.startsWith("/api/schedule") && req.method === "POST" ||
      req.baseUrl?.includes("/admin");

    if (isAdminRoute) {
      if (req.cookies?.admin_token) {
        token = req.cookies.admin_token;
        tokenSource = "admin_token";
      }
    } else {
      if (req.cookies?.user_token) {
        token = req.cookies.user_token;
        tokenSource = "user_token";
      }
    }

    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
      tokenSource = "Bearer header";
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated. Please login.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id)
      .select("-password -__v")
      .lean();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found or deleted.",
      });
    }

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
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

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