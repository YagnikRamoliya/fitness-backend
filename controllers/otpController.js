import nodemailer from "nodemailer";
import Otp from "../models/Otp.js";
import Order from "../models/Order.js";
import User from "../models/User.js";
import Membership from "../models/Membership.js";
import mongoose from "mongoose";
import Program from "../models/Program.js";
import ScheduleEvent from "../models/ScheduleEvent.js";
import { format, addDays } from "date-fns";
import Cart from "../models/Cart.js";
import { sendNotification } from "../services/notificationService.js";
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASS,
  },
});

// ====================== SEND OTP ======================
export const sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const normalizedEmail = email.toLowerCase().trim();

    await Otp.deleteMany({ email: normalizedEmail });

    await Otp.create({
      email: normalizedEmail,
      otp,
      expiresIn: new Date(Date.now() + 10 * 60 * 1000),
    });

    await transporter.sendMail({
      from: `"FitTrack Health" <${process.env.EMAIL}>`,
      to: normalizedEmail,
      subject: "Your OTP Code - FitTrack Health",
      text: `Your verification code is ${otp}. Valid for 10 minutes.`,
      html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 30px; border: 1px solid #eee; border-radius: 12px; text-align: center; background: #f9f9f9;">
              <h2 style="color: #E3002A;">FitTrack Health</h2>
              <h1 style="font-size: 42px; letter-spacing: 10px; color: #E3002A; margin: 20px 0;">${otp}</h1>
              <p style="color: #555; font-size: 16px;">Your verification code</p>
              <p style="color: #888; font-size: 14px;">Expires in <strong>10 minutes</strong></p>
              <hr style="margin: 30px 0; border: 0; border-top: 1px solid #eee;" />
              <p style="color: #999; font-size: 12px;">© 2025 FitLife Pro. All rights reserved.</p>
            </div>
          `,
    });

    return res.status(200).json({ message: "OTP sent successfully!" });
  } catch (error) {
    console.error("Send OTP Error:", error);
    return res.status(500).json({ message: "Failed to send OTP. Try again." });
  }
};

// ====================== VERIFY OTP + PROCESS PAYMENT (FULLY FIXED) ======================
export const verifyOtpAndSaveOrder = async (req, res) => {
  try {
    const {
      email: rawEmail,
      otp,
      userDetails,
      cardDetails,
      programs = [],
      classes = [],
      challenges = [],
      nutrition = [],
      total,
      membershipId,
    } = req.body;

    const email = rawEmail?.toLowerCase().trim();
    // Prevent same title in both programs and classes
    const allTitles = [
      ...programs.map((p) => p.title.toLowerCase()),
      ...classes.map((c) => c.title.toLowerCase()),
    ];
    if (new Set(allTitles).size !== allTitles.length) {
      return res.status(400).json({ message: "Duplicate items not allowed!" });
    }
    // Validate OTP
    const otpRecord = await Otp.findOne({ email });
    if (
      !otpRecord ||
      otpRecord.otp !== otp ||
      new Date(otpRecord.expiresIn) < new Date()
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    const loggedInUser = req.user ? await User.findById(req.user.id) : null;
    let membershipInfo = null;
    const orderItems = []; // Unified array for Order document

    // 1. MEMBERSHIP PURCHASE
    // Inside verifyOtpAndSaveOrder → after OTP validation

    // 1. MEMBERSHIP PURCHASE
    if (membershipId) {
      const membership = await Membership.findById(membershipId);
      if (!membership)
        return res.status(404).json({ message: "Plan not found" });

      const startDate = new Date();
      let monthsToAdd = 1;
      const durationStr = membership.duration.toLowerCase();
      if (durationStr.includes("year")) monthsToAdd = 12;
      else if (durationStr.includes("month")) {
        const match = durationStr.match(/(\d+)\s*month/);
        monthsToAdd = match ? parseInt(match[1]) || 1 : 1;
      }
      const expiresAt = new Date(startDate);
      expiresAt.setMonth(startDate.getMonth() + monthsToAdd);

      membershipInfo = {
        _id: membership._id,
        plan: membership.name,
        price: membership.price,
        duration: membership.duration,
        features: membership.features,
        startedAt: startDate,
        expiresAt,
        isActive: true,
      };

      orderItems.push({
        title: `${membership.name} Membership`,
        price: total,
        type: "membership",
        itemId: membership._id,
      });

      // ← YE SABSE ZAROORI — USER KO MEMBERSHIP ASSIGN KARO
      if (loggedInUser) {
        console.log(
          "Assigning membership to logged in user:",
          loggedInUser.email
        );

        // Membership assign
        loggedInUser.membership = membershipInfo;
        loggedInUser.markModified("membership");

        // Programs assign based on plans array (Basic/Premium/Pro access)
        const matchingPrograms = await Program.find({
          plans: { $in: membership.plans },
        });

        console.log(
          `Found ${matchingPrograms.length} programs for plans:`,
          membership.plans
        );

        // Assign workouts
        matchingPrograms.forEach((p) => {
          if (
            !loggedInUser.assignedWorkouts.some(
              (id) => id.toString() === p._id.toString()
            )
          ) {
            loggedInUser.assignedWorkouts.push(p._id);
          }
        });

        // Enroll in programs
        matchingPrograms.forEach((program) => {
          const exists = loggedInUser.enrolledPrograms.some(
            (e) => e.programId.toString() === program._id.toString()
          );
          if (!exists) {
            loggedInUser.enrolledPrograms.push({
              programId: program._id,
              title: program.title,
              trainerName: program.trainerName || "Trainer",
              enrolledAt: new Date(),
              progress: 0,
              completedDays: 0,
            });
          }
        });

        await loggedInUser.save();
        console.log(" Membership & programs successfully assigned to user!");
      }
    }

    // 2. PROGRAMS + CLASSES PURCHASE (BOTH SUPPORTED TOGETHER)
    if (!membershipId && loggedInUser) {
      // Initialize arrays if they don't exist
      if (!loggedInUser.purchasedPrograms) loggedInUser.purchasedPrograms = [];
      if (!loggedInUser.assignedWorkouts) loggedInUser.assignedWorkouts = [];
      if (!loggedInUser.purchasedClasses) loggedInUser.purchasedClasses = [];
      if (!loggedInUser.assignedClasses) loggedInUser.assignedClasses = [];
      if (!loggedInUser.purchasedChallenges)
        loggedInUser.purchasedChallenges = [];
      if (!loggedInUser.assignedChallenges)
        loggedInUser.assignedChallenges = [];
      if (!loggedInUser.purchasedNutritionPlans)
        loggedInUser.purchasedNutritionPlans = [];
      if (!loggedInUser.assignedNutritionPlans)
        loggedInUser.assignedNutritionPlans = [];

      // Handle Programs (custom id) + ScheduleEvent Creation
      if (programs.length > 0 && loggedInUser) {
        for (const p of programs) {
          const programCustomId = String(p.id).trim();
          if (!programCustomId) continue;

          const programData = await Program.findOne({
            id: programCustomId,
          }).lean();
          if (
            !programData ||
            !programData.days ||
            programData.days.length === 0
          ) {
            console.warn("Program not found or has no days:", programCustomId);
            continue;
          }

          orderItems.push({
            title: p.title || programData.title,
            price: Number(p.price) || 0,
            type: "program",
            itemId: programData.id,
          });

          const alreadyPurchased = loggedInUser.purchasedPrograms.some(
            (item) => String(item.programId) === programData.id
          );

          if (!alreadyPurchased) {
            loggedInUser.purchasedPrograms.push({
              programId: programData.id, // ← यही MAIN FIX
              title: programData.title,
              trainerName: programData.trainerName || "Trainer",
              purchaseDate: new Date(),
              status: "active",
            });

            if (!loggedInUser.assignedWorkouts.includes(programData.id)) {
              loggedInUser.assignedWorkouts.push(programData.id); // ← यही भी FIX
            }
          }

          // Schedule Events (calendar)
          const startDate = new Date();
          for (let i = 0; i < programData.days.length; i++) {
            const day = programData.days[i];
            const eventDate = format(addDays(startDate, i), "yyyy-MM-dd");

            const exists = await ScheduleEvent.findOne({
              userId: loggedInUser._id,
              programId: programData.id,
              date: eventDate,
            });

            if (!exists) {
              await ScheduleEvent.create({
                userId: loggedInUser._id,
                programId: programData.id,
                title: day.title || `Day ${i + 1} - ${programData.title}`,
                date: eventDate,
                source: "program",
                status: "scheduled",
                completed: false,
              });
            }
          }
        }
      }

      if (classes.length > 0) {
        for (const c of classes) {
          const rawId = c._id || c.id;

          if (!rawId) {
            console.warn("Missing class ID:", c);
            continue;
          }

          let classObjectId;
          try {
            classObjectId = new mongoose.Types.ObjectId(rawId);
          } catch (err) {
            console.warn("Invalid ObjectId format:", rawId);
            continue;
          }

          orderItems.push({
            title: c.title || "Untitled Class",
            price: Number(c.price) || 0,
            type: "class",
            itemId: classObjectId,
          });

          const alreadyPurchased = loggedInUser.purchasedClasses.some(
            (item) =>
              item.classId &&
              item.classId.toString() === classObjectId.toString()
          );

          if (!alreadyPurchased) {
            loggedInUser.purchasedClasses.push({
              classId: classObjectId,
              title: c.title || "Untitled Class",
              trainerName: c.trainerName || "Trainer",
              purchaseDate: new Date(),
              status: "active",
            });
          }

          // ---------- Schedule Event for Class ----------
          const startDate = new Date();
          const classEventTitle = c.title || "Scheduled Class";
          const exists = await ScheduleEvent.findOne({
            userId: loggedInUser._id,
            classId: classObjectId,
            date: format(startDate, "yyyy-MM-dd"),
          });

          if (!exists) {
            await ScheduleEvent.create({
              userId: loggedInUser._id,
              classId: classObjectId,
              title: classEventTitle,
              date: format(startDate, "yyyy-MM-dd"), // use same ID
              source: "class",
              status: "scheduled",
              completed: false,
            });
          }
        }
      }

      if (challenges.length > 0) {
        for (const ch of challenges) {
          const rawId = ch._id || ch.id;

          if (!rawId) {
            console.warn("Missing challenge ID:", ch);
            continue;
          }

          let challengeObjectId;
          try {
            challengeObjectId = new mongoose.Types.ObjectId(rawId);
          } catch (err) {
            console.warn("Invalid challenge ObjectId:", rawId);
            continue;
          }

          orderItems.push({
            title: ch.title || "Untitled Challenge",
            price: Number(ch.price) || 0,
            type: "challenge",
            itemId: challengeObjectId,
          });

          const alreadyPurchased = loggedInUser.purchasedChallenges?.some(
            (p) => p.challengeId?.toString() === challengeObjectId.toString()
          );

          if (!alreadyPurchased) {
            loggedInUser.purchasedChallenges.push({
              challengeId: challengeObjectId,
              title: ch.title || "Untitled Challenge",
              trainerName: ch.trainerName || "Trainer",
              purchaseDate: new Date(),
              status: "active",
            });
          }

          // ---------- Schedule Event for Challenge ----------
          const startDate = new Date();
          const challengeEventTitle = ch.title || "Scheduled Challenge";
          const exists = await ScheduleEvent.findOne({
            userId: loggedInUser._id,
            challengeId: challengeObjectId,
            date: format(startDate, "yyyy-MM-dd"),
          });

          if (!exists) {
            await ScheduleEvent.create({
              userId: loggedInUser._id,
              challengeId: challengeObjectId,
              title: challengeEventTitle,
              date: format(startDate, "yyyy-MM-dd"),
              source: "challenge",
              status: "scheduled",
              completed: false,
            });
          }
        }
      }

      if (nutrition.length > 0) {
        // YE 2 LINES SABSE POWERFUL HAIN — CHAHE FIELD HO YA NA HO, BANEGA!
        loggedInUser.purchasedNutritionPlans =
          loggedInUser.get("purchasedNutritionPlans") || [];
        loggedInUser.assignedNutritionPlans =
          loggedInUser.get("assignedNutritionPlans") || [];

        for (const n of nutrition) {
          const rawId = n._id || n.id;
          if (!rawId) continue;

          let planObjectId;
          try {
            planObjectId = new mongoose.Types.ObjectId(rawId);
          } catch (err) {
            console.warn("Invalid Nutrition Plan ID:", rawId);
            continue;
          }

          // Avoid duplicate
          const alreadyPurchased = loggedInUser.purchasedNutritionPlans.some(
            (item) => item.planId?.toString() === planObjectId.toString()
          );

          if (!alreadyPurchased) {
            loggedInUser.purchasedNutritionPlans.push({
              planId: planObjectId,
              title: n.title || "Nutrition Plan",
              trainerName: n.trainerName || "Nutritionist",
              purchaseDate: new Date(),
              status: "active",
            });

            loggedInUser.assignedNutritionPlans.push(planObjectId);
          }

          orderItems.push({
            title: n.title || "Nutrition Plan",
            price: Number(n.price) || 0,
            type: "nutrition",
            itemId: planObjectId,
          });
        }
      } // Save once after all updates
      await loggedInUser.save();
    }
    console.log("=== ABOUT TO CREATE ORDER ===");
    console.log("User ID:", loggedInUser?._id || "Guest");
    console.log("Total:", total);
    console.log("Order Items:", orderItems);
    console.log("Card Last4:", cardDetails.cardNumber?.slice(-4) || "0000");
    // 3. CREATE ORDER
    // 3. CREATE ORDER
    const order = await Order.create({
      user: loggedInUser?._id || null,
      guestEmail: loggedInUser ? null : email,
      isAnonymous: !loggedInUser,
      userDetails: {
        name: userDetails.name?.trim() || "Guest",
        email,
        phone: userDetails.phone || "",
        address: userDetails.address || "",
        city: userDetails.city || "",
        country: userDetails.country || "",
      },
      cardDetails: {
        last4: cardDetails.cardNumber?.slice(-4) || "0000",
        nameOnCard: cardDetails.nameOnCard || "Guest",
        expiry: cardDetails.expiry || "XX/XX",
      },
      programs:
        orderItems.length > 0
          ? orderItems
          : [{ title: "Purchase", price: total }],
      total,
      status: "Completed",
      paymentMethod: "card",
      isMembershipPurchase: !!membershipId,
      membershipInfo,
    });

    // ====== ADMIN NOTIFICATION FOR PURCHASE ======
    try {
      const admins = await User.find({ role: "admin" });

      const buyerName = loggedInUser
        ? loggedInUser.name || loggedInUser.email.split("@")[0]
        : userDetails.name || "A guest user";

      let purchaseType = "";
      let purchaseTitle = "";
      let notificationIcon = "activity"; 

      if (membershipId) {
        purchaseType = "Membership";
        purchaseTitle = membershipInfo?.plan || "Plan";
        notificationIcon = "membership"; 
      } else if (programs.length > 0) {
        purchaseType = "Program";
        purchaseTitle = programs[0].title || "Workout Program";
        notificationIcon = "purchase"; 
      } else if (classes.length > 0) {
        purchaseType = "Live Class";
        purchaseTitle = classes[0].title || "Fitness Class";
        notificationIcon = "purchase";
      } else if (challenges.length > 0) {
        purchaseType = "Challenge";
        purchaseTitle = challenges[0].title || "Fitness Challenge";
        notificationIcon = "purchase";
      } else if (nutrition.length > 0) {
        purchaseType = "Nutrition Plan";
        purchaseTitle = nutrition[0].title || "Meal Plan";
        notificationIcon = "purchase";
      } else {
        purchaseType = "Purchase";
        purchaseTitle = "Item";
        notificationIcon = "purchase";
      }

      const notificationTitle = `New ${purchaseType} Purchase! `;
      const notificationMessage = `${buyerName} just purchased "${purchaseTitle}" for ₹${total}`;

      for (const admin of admins) {
        await sendNotification(
          admin._id,
          "admin",
          notificationTitle,
          notificationMessage,
          "success",
          notificationIcon 
        );
      }

      console.log(`Admin notification sent: ${purchaseType} by ${buyerName}`);
    } catch (notifyErr) {
      console.error("Failed to send admin purchase notification:", notifyErr);
    }
    // Clear cart if logged in
    if (loggedInUser) {
      await Cart.findOneAndUpdate(
        { userId: loggedInUser._id },
        {
          items: [],
          totalAmount: 0,
          itemCount: 0,
        },
        { new: true }
      );
    }

    // Delete OTP
    await Otp.deleteOne({ _id: otpRecord._id });

    return res.status(201).json({
      success: true,
      message: membershipId
        ? "Membership activated successfully!"
        : nutrition.length > 0 &&
          programs.length + classes.length + challenges.length === 0
        ? "Nutrition Plan purchased successfully!"
        : classes.length > 0 &&
          programs.length + challenges.length + nutrition.length === 0
        ? "Class purchased!"
        : programs.length > 0 &&
          classes.length + challenges.length + nutrition.length === 0
        ? "Program purchased successfully!"
        : "Purchase completed successfully! Check your dashboard.",
      orderId: order._id,
    });
  } catch (error) {
    console.error("Purchase Error:", error);
    return res
      .status(500)
      .json({ message: "Server error. Please try again later." });
  }
};
