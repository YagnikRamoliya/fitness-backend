import NutritionPlan from "../models/NutritionPlan.js";
import cloudinary from "../config/cloudinary.js";
import User from "../models/User.js";
import mongoose from "mongoose";
// ------------------------ CREATE (FormData + JSON compatible) ------------------------
export const createPlan = async (req, res) => {
  try {
    let data = {};

    try {
      const jsonData = req.body.data || req.body.plan || "{}";
      data = JSON.parse(jsonData);
      console.log("Using JSON data");
    } catch (jsonErr) {
      console.log("JSON parsing failed, using FormData parsing");
      data = { ...req.body };
    }

    //  FIXED: Handle multiple files from multer .any()
    let coverFile =
      req.files?.find((f) => f.fieldname === "coverImage") || null;

    // ---- HANDLE MEAL THUMBNAILS ----
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        if (file.fieldname.startsWith("meal-")) {
          const [, dayIndex, mealIndex] = file.fieldname.split("-");

          if (data.days?.[dayIndex]?.meals?.[mealIndex]) {
            data.days[dayIndex].meals[mealIndex].thumbnail = {
              url: file.path,
              fileName: file.filename,
            };
          }
        }
      });
    }

    // Set cover image
    if (coverFile) {
      data.coverImage = {
        url: coverFile.path,
        fileName: coverFile.originalname,
      };
    }

    data.title = data.title || "Untitled Plan";
    data.level = data.level || "Beginner";

    if (!data.plans || !Array.isArray(data.plans) || data.plans.length === 0) {
      data.plans = ["Basic"];
      console.log("Default plans set to ['Basic']");
    }

    console.log(" Final Plan Data:", JSON.stringify(data, null, 2));
    // Set default values for meals (createPlan me)
    if (data.days && Array.isArray(data.days)) {
      data.days.forEach((day) => {
        if (day.meals && Array.isArray(day.meals)) {
          day.meals.forEach((meal) => {
            // Only set default if truly missing (not 0!)
            if (meal.prepTime === undefined || meal.prepTime === null)
              meal.prepTime = 10;
            if (meal.cookTime === undefined || meal.cookTime === null)
              meal.cookTime = 20;
            if (!meal.difficulty) meal.difficulty = "Easy";
            if (!meal.mealType) meal.mealType = "Veg";
            meal.totalTime = meal.totalTime ?? meal.prepTime + meal.cookTime;
          });
        }
      });
    }

    const plan = await NutritionPlan.create(data);
    res.status(201).json(plan);
  } catch (err) {
    console.error("❌ Create plan error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ---------------- GET ALL ---------------
export const getPlans = async (req, res) => {
  try {
    const plans = await NutritionPlan.find().sort({ createdAt: -1 });
    res.json(plans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ----------------- GET ONE ------------------
export const getPlanById = async (req, res) => {
  try {
    const plan = await NutritionPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: "Plan not found" });
    res.json(plan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ------------------------ UPDATE ------------------------
export const updatePlan = async (req, res) => {
  try {
    let data = {};

    // 1️⃣ Parse JSON
    try {
      const jsonData = req.body.data || req.body.plan || "{}";
      data = JSON.parse(jsonData);
    } catch {
      data = { ...req.body };
    }

    // 2️⃣ Get old plan
    const oldPlan = await NutritionPlan.findById(req.params.id);
    if (!oldPlan) {
      return res.status(404).json({ message: "Plan not found" });
    }

    // 3️⃣ Handle uploaded files
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        // Cover image
        if (file.fieldname === "coverImage") {
          data.coverImage = {
            url: file.path,
            fileName: file.filename,
          };
        }

        // Meal thumbnails
        if (file.fieldname.startsWith("meal-")) {
          const [, dayIndex, mealIndex] = file.fieldname.split("-");

          if (!data.days) data.days = [];
          if (!data.days[dayIndex]) data.days[dayIndex] = { meals: [] };
          if (!data.days[dayIndex].meals) data.days[dayIndex].meals = [];

          data.days[dayIndex].meals[mealIndex] = {
            ...data.days[dayIndex].meals[mealIndex],
            thumbnail: {
              url: file.path,
              fileName: file.filename,
            },
          };
        }
      });
    }

    // 4️⃣ PRESERVE OLD COVER IMAGE
    if (!data.coverImage) {
      data.coverImage = oldPlan.coverImage;
    }

    // 5️⃣ PRESERVE OLD MEAL THUMBNAILS
    oldPlan.days.forEach((oldDay, dIdx) => {
      oldDay.meals.forEach((oldMeal, mIdx) => {
        if (!data.days?.[dIdx]?.meals?.[mIdx]?.thumbnail) {
          data.days[dIdx].meals[mIdx].thumbnail = oldMeal.thumbnail;
        }
      });
    });

    if (data.days && Array.isArray(data.days)) {
      data.days.forEach((day) => {
        if (day.meals && Array.isArray(day.meals)) {
          day.meals.forEach((meal) => {
            if (meal.prepTime === undefined || meal.prepTime === null)
              meal.prepTime = 10;
            if (meal.cookTime === undefined || meal.cookTime === null)
              meal.cookTime = 20;
            if (!meal.difficulty) meal.difficulty = "Easy";
            if (!meal.mealType) meal.mealType = "Veg";
            meal.totalTime = meal.totalTime ?? meal.prepTime + meal.cookTime;
          });
        }
      });
    }

    // 6️⃣ Update plan
    const updatedPlan = await NutritionPlan.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );

    res.json(updatedPlan);
  } catch (err) {
    console.error("❌ Update plan error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ------------------------ DELETE ------------------------
export const deletePlan = async (req, res) => {
  try {
    const plan = await NutritionPlan.findByIdAndDelete(req.params.id);

    if (!plan) return res.status(404).json({ message: "Plan not found" });

    // Delete cover image from Cloudinary
    if (plan.coverImage?.fileName) {
      await cloudinary.uploader.destroy(plan.coverImage.fileName);
    }

    res.json({ message: "Plan deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ------------------------ UPDATE STATUS ONLY ------------------------
export const updatePlanStatus = async (req, res) => {
  try {
    const plan = await NutritionPlan.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );

    if (!plan) return res.status(404).json({ message: "Plan not found" });

    res.json(plan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// --------------- GET USER NUTRITION PLANS -------------
export const getUserNutritionPlans = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) return res.status(404).json({ message: "User not found" });

    let finalPlans = [];

    if (
      user.purchasedNutritionPlans &&
      user.purchasedNutritionPlans.length > 0
    ) {
      for (const purchased of user.purchasedNutritionPlans) {
        if (!purchased.planId) continue;

        try {
          const planId = new mongoose.Types.ObjectId(String(purchased.planId));
          const plan = await NutritionPlan.findById(planId).lean();
          if (plan) finalPlans.push(plan);
        } catch (err) {
          console.warn(
            "Invalid planId in purchasedNutritionPlans:",
            purchased.planId
          );
        }
      }
    }

    // 2. ASSIGNED NUTRITION PLANS
    if (user.assignedNutritionPlans && user.assignedNutritionPlans.length > 0) {
      for (const assignedId of user.assignedNutritionPlans) {
        if (!assignedId) continue;
        try {
          const planId = new mongoose.Types.ObjectId(String(assignedId));
          const plan = await NutritionPlan.findById(planId).lean();
          if (plan) finalPlans.push(plan);
        } catch (err) {
          console.warn("Invalid assignedNutritionPlan ID:", assignedId);
        }
      }
    }

    // 3. MEMBERSHIP PLANS
    if (user.membership?.isActive) {
      const allowedPlans = ["Basic"];
      if (user.membership.plan === "Premium") allowedPlans.push("Premium");
      if (user.membership.plan === "Pro") allowedPlans.push("Pro", "Premium");

      const membershipPlans = await NutritionPlan.find({
        status: "Active",
        plans: { $in: allowedPlans },
      }).lean();

      finalPlans.push(...membershipPlans);
    }

    // Remove duplicates
    const uniquePlans = Array.from(
      new Map(finalPlans.map((p) => [p._id.toString(), p])).values()
    );

    return res.json({
      plans: uniquePlans,
      total: uniquePlans.length,
      nutritionProgress: user.nutritionProgress || [],
    });
  } catch (err) {
    console.error("getUserNutritionPlans Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const markMealComplete = async (req, res) => {
  try {
    const { mealId, planId, dayIndex } = req.body;
    const userId = req.user._id;

    console.log("POST /mark-meal-complete HIT!");
    console.log("Body:", { mealId, planId, dayIndex });
    console.log("User ID:", userId);

    // ✅ YEH DO LINES ADD KARO (Critical Fix)
    const planObjectId = new mongoose.Types.ObjectId(planId);
    const mealObjectId = new mongoose.Types.ObjectId(mealId);

    console.log("Converted planId to ObjectId:", planObjectId);
    console.log("Converted mealId to ObjectId:", mealObjectId);
    // ✅ Duplicate check — already completed hai to skip
    const alreadyExists = await User.findOne({
      _id: userId,
      "nutritionProgress.planId": planObjectId,
      "nutritionProgress.completedMeals": {
        $elemMatch: {
          mealId: mealObjectId,
          dayIndex: Number(dayIndex),
        },
      },
    });

    if (alreadyExists) {
      console.log("ℹ️ Meal already marked complete for this day — skipping");
      return res.json({ success: true, message: "Already completed" });
    }
    // Step 1: Existing progress update karo
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: userId,
        "nutritionProgress.planId": planObjectId, // ← ObjectId se match
      },
      {
        $addToSet: {
          "nutritionProgress.$.completedMeals": {
            mealId: mealObjectId,
            dayIndex: Number(dayIndex),
            completedAt: new Date(),
          },
        },
      },
      { new: true }
    );

    if (updatedUser) {
      console.log("✅ SUCCESS: Progress updated in existing plan");
      console.log("Updated nutritionProgress:", updatedUser.nutritionProgress);
      return res.json({ success: true, message: "Meal marked as complete" });
    } else {
      console.log("⚠️ No existing progress found, creating new entry...");

      // Step 2: Naya progress entry banao
      const newUser = await User.findByIdAndUpdate(
        userId,
        {
          $push: {
            nutritionProgress: {
              planId: planObjectId,
              completedMeals: [
                {
                  mealId: mealObjectId,
                  dayIndex: Number(dayIndex),
                  completedAt: new Date(),
                },
              ],
            },
          },
        },
        { new: true }
      );

      if (newUser) {
        console.log("✅ SUCCESS: New progress entry created");
        console.log("New nutritionProgress:", newUser.nutritionProgress);
      } else {
        console.log("❌ FAILED: Even new entry not created");
      }

      res.json({ success: true, message: "Meal marked as complete" });
    }
  } catch (err) {
    console.error("❌ ERROR in markMealComplete:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
