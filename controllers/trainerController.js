// controllers/trainerController.js
import Trainer from "../models/Trainer.js";

// ============== CREATE TRAINER =================
export const createTrainer = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      status = "Active",
      workout = "",
      avatar = "",
      bio = "",
      role = "Trainer",
      specialties = "",
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    const trainerData = {
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim(),
      status,
      workout: workout.trim(),
      avatar: avatar.trim() || name.charAt(0).toUpperCase(),
      bio: bio.trim(),
      role,
      specialties: specialties
        ? specialties.split(",").map(s => s.trim()).filter(Boolean)
        : [],
      img: req.file ? req.file.path : null,
    };

    const trainer = new Trainer(trainerData);
    await trainer.save();
    res.status(201).json(trainer);
  } catch (err) {
    console.error("Create Trainer Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ====================== UPDATE TRAINER ======================
export const updateTrainer = async (req, res) => {
  try {
    const { name, email, specialties = "", img: oldImg, ...rest } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    const updateData = {
      name: name.trim(),
      email: email.trim(),
      ...rest,
      avatar: rest.avatar || name.charAt(0).toUpperCase(),
      specialties: specialties
        ? specialties.split(",").map(s => s.trim()).filter(Boolean)
        : [],
      img: req.file ? req.file.path : (oldImg || null),
    };

    const trainer = await Trainer.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!trainer) return res.status(404).json({ message: "Trainer not found" });
    res.json(trainer);
  } catch (err) {
    console.error("Update Trainer Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ====================== DELETE TRAINER ======================
export const deleteTrainer = async (req, res) => {
  try {
    const trainer = await Trainer.findByIdAndDelete(req.params.id);
    if (!trainer) return res.status(404).json({ message: "Trainer not found" });

    res.json({ message: "Trainer deleted successfully" });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ====================== GET ALL TRAINERS ======================
export const getTrainers = async (req, res) => {
  try {
    const { page = 1, limit = 5, search = "" } = req.query;
    const query = search ? { name: { $regex: search, $options: "i" } } : {};

    const trainers = await Trainer.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Trainer.countDocuments(query);

    res.json({ trainers, total });
  } catch (err) {
    console.error("Get Trainers Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ====================== GET SINGLE TRAINER ======================
export const getTrainerById = async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.params.id);
    if (!trainer) return res.status(404).json({ message: "Trainer not found" });
    res.json(trainer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ====================== UPDATE TRAINER STATUS ======================
export const updateTrainerStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["Active", "Inactive"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const trainer = await Trainer.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!trainer) {
      return res.status(404).json({ message: "Trainer not found" });
    }

    res.json(trainer);
  } catch (err) {
    console.error("Status Update Error:", err);
    res.status(500).json({ message: err.message });
  }
};
