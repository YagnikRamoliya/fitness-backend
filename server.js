// server.js (or index.js)

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import bcrypt from "bcryptjs";
import User from "./models/User.js";

// Import all routes ONCE
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import programRoutes from "./routes/programRoutes.js";
import classesRoutes from "./routes/classesRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";
import membershipRoutes from "./routes/membershipRoutes.js";
import otpRoutes from "./routes/otpRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import challengeRoutes from "./routes/challengeRoutes.js";
import nutritionRoutes from "./routes/nutritionRoutes.js";
import goalRoutes from "./routes/goalRoutes.js";
import scheduleRoutes from "./routes/scheduleRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import trainerRoutes from "./routes/trainerRoutes.js";
import leaderboardRoutes from "./routes/leaderboardRoutes.js";
import revenueRoutes from "./routes/revenueRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import settingsRoutes from "./routes/settingsRoutes.js";
import adminNotificationRoutes from "./routes/adminNotificationRoutes.js";

dotenv.config();

const app = express();

// CORS setup
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "30mb", extended: true }));
app.use(express.urlencoded({ limit: "30mb", extended: true }));
app.use(cookieParser());

// Mount routes correctly
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/programs", programRoutes);
app.use("/api/classes", classesRoutes);
app.use("/api/auth/cart", cartRoutes); // note: this is under /api/auth/cart
app.use("/api/trainers", trainerRoutes);
app.use("/api/otp", otpRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/memberships", membershipRoutes);
app.use("/api/challenges", challengeRoutes);
app.use("/api/nutrition", nutritionRoutes);
app.use("/api/admin/goals", goalRoutes);        
app.use("/api/schedule", scheduleRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/admin/revenue", revenueRoutes);    
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/admin/notifications", adminNotificationRoutes);

app.get("/", (req, res) => res.send("API Running – Ready!"));

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"], // ← अपने Vite ports
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type"],
  },
});

global.io = io;

io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on("register", ({ role, id }) => {
    if (!role || !id) return;
    const room = `${role}_${id}`;
    socket.join(room);
    console.log(`${role} ${id} joined room → ${room}`);
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Create default admin
const createDefaultAdmin = async () => {
  try {
    const adminEmail = "admin@gmail.com";
    const existingAdmin = await User.findOne({
      $or: [{ email: adminEmail }, { role: "admin" }],
    });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("Admin@123", 12);
      await User.create({
        name: "Super Admin",
        email: adminEmail,
        password: hashedPassword,
        role: "admin",
        phone: "9999999999",
        gender: "Male",
        dob: new Date("1990-01-01"),
        joined: new Date(),
        adminPermissions: {
          canManageUsers: true,
          canManageContent: true,
          canViewRevenue: true,
        },
      });
      console.log("✅ Default Super Admin created: admin@gmail.com / Admin@123");
    } else {
      console.log("✅ Admin account already exists");
      if (existingAdmin.email === adminEmail && existingAdmin.role !== "admin") {
        existingAdmin.role = "admin";
        await existingAdmin.save();
        console.log("🔧 Fixed role for default admin");
      }
    }
  } catch (err) {
    if (err.code === 11000) {
      console.log("⚠️ Admin already exists (safe to ignore)");
    } else {
      console.error("❌ Failed to create default admin:", err.message);
    }
  }
};

// Start server
const startServer = async () => {
  try {
    await connectDB();
    console.log("🟢 MongoDB Connected");

    await createDefaultAdmin();

    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`🔴 Socket.IO ready`);
    });
  } catch (err) {
    console.error("💥 Server failed to start:", err);
    process.exit(1);
  }
};

startServer(); 