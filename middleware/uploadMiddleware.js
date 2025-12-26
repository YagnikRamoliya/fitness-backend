// middleware/uploadMiddleware.js

import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

// =============== COMMON CONFIG ===============
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FORMATS = ["jpg", "jpeg", "png", "webp"];

const commonTransformation = [
  { width: 1200, height: 800, crop: "limit" },
  { quality: "auto:good" },
  { fetch_format: "auto" },
];

// Helper to generate unique public_id
const generatePublicId = (file) => {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1e9);
  const originalName = file.originalname.split(".")[0].replace(/[^a-zA-Z0-9]/g, "");
  return `${originalName}-${timestamp}-${random}`;
};

// ======================= PROGRAM STORAGE =======================
const programStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "fitness/programs",
    allowed_formats: ALLOWED_FORMATS,
    transformation: commonTransformation,
    public_id: (req, file) => generatePublicId(file),
  },
});

// ======================= CLASS STORAGE =======================
const classStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: (req, file) => {
      if (file.fieldname.startsWith("exercise_")) {
        return "fitness/classes/exercises";
      }
      return "fitness/classes/thumbnails";
    },
    allowed_formats: ALLOWED_FORMATS,
    transformation: commonTransformation,
    public_id: (req, file) => generatePublicId(file),
  },
});

// ======================= NUTRITION STORAGE =======================
const nutritionStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: (req, file) => {
      if (file.fieldname === "coverImage") {
        return "fitness/nutrition/covers";
      }
      if (file.fieldname.startsWith("meal-")) {
        return "fitness/nutrition/meals";
      }
      return "fitness/nutrition/others";
    },
    allowed_formats: ALLOWED_FORMATS,
    transformation: commonTransformation,
    public_id: (req, file) => generatePublicId(file),
  },
});

// =============== FILE FILTERS ===============
const programFileFilter = (req, file, cb) => {
  const allowedFields = ["thumbnail", "coverImage"];
  const isExercise = file.fieldname.startsWith("exercise-");

  if (allowedFields.includes(file.fieldname) || isExercise) {
    cb(null, true);
  } else {
    cb(new Error(`Unexpected field: ${file.fieldname}. Allowed: thumbnail, exercise-*`), false);
  }
};

const classFileFilter = (req, file, cb) => {
  if (file.fieldname === "thumbnail" || file.fieldname.startsWith("exercise_")) {
    cb(null, true);
  } else {
    cb(new Error(`Unexpected field: ${file.fieldname}. Allowed: thumbnail, exercise_*`), false);
  }
};

const nutritionFileFilter = (req, file, cb) => {
  if (file.fieldname === "coverImage" || file.fieldname.startsWith("meal-")) {
    cb(null, true);
  } else {
    cb(new Error(`Unexpected field: ${file.fieldname}. Allowed: coverImage, meal-*`), false);
  }
};

// ============ EXPORTED MIDDLEWARES ============

// For Program uploads (thumbnail + exercise images)
export const uploadProgramThumbnail = multer({
  storage: programStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: programFileFilter,
}).any();

// For Class uploads
export const uploadClassFiles = multer({
  storage: classStorage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 51, 
  },
  fileFilter: classFileFilter,
}).any();

// For Nutrition Plan uploads
export const uploadNutritionFiles = multer({
  storage: nutritionStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: nutritionFileFilter,
}).any();

// Single thumbnai
export const uploadClassThumbnail = multer({
  storage: classStorage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: classFileFilter,
}).single("thumbnail");

// Array upload for multiple exercise thumbnails
export const uploadExerciseThumbnails = multer({
  storage: classStorage,
  limits: { fileSize: MAX_FILE_SIZE, files: 50 },
  fileFilter: classFileFilter,
}).array("exerciseThumbnails", 50);