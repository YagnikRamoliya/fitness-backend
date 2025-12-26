import ScheduleEvent from "../models/ScheduleEvent.js";
import Program from "../models/Program.js";
import Challenge from "../models/Challenge.js";
import Class from "../models/Class.js";
import { sendNotification } from "../services/notificationService.js";
import User from "../models/User.js";

// ---------------- UTILS ----------------
const enrichEvents = async (events) => {
  // Collect all unique ids first
  const programIds = [
    ...new Set(events.filter((e) => e.programId).map((e) => e.programId)),
  ];
  const challengeIds = [
    ...new Set(events.filter((e) => e.challengeId).map((e) => e.challengeId)),
  ];
  const classIds = [
    ...new Set(events.filter((e) => e.classId).map((e) => e.classId)),
  ];

  // Batch fetch
  const programs = await Program.find({ id: { $in: programIds } })
    .select("id title thumbnail")
    .lean();
  const challenges = await Challenge.find({ _id: { $in: challengeIds } })
    .select("title thumbnail")
    .lean();
  const classes = await Class.find({ _id: { $in: classIds } })
    .select("title thumbnail")
    .lean();

  return events.map((e) => {
    if (e.programId) {
      const p = programs.find((p) => p.id === e.programId);
      e.sourceName = p?.title || "Program";
      e.sourceThumbnail = p?.thumbnail;
    } else if (e.challengeId) {
      const c = challenges.find(
        (c) => c._id.toString() === e.challengeId.toString()
      );
      e.sourceName = c?.title || "Challenge";
      e.sourceThumbnail = c?.thumbnail;
    } else if (e.classId) {
      const cls = classes.find(
        (c) => c._id.toString() === e.classId.toString()
      );
      e.sourceName = cls?.title || "Class";
      e.sourceThumbnail = cls?.thumbnail;
    } else {
      e.sourceName = "Manual Workout";
    }
    return e;
  });
};

// ---------------- GET MEMBER SCHEDULE ----------------
export const getMemberSchedule = async (req, res) => {
  try {
    const userId = req.user._id;
    const { month } = req.query;
    if (!month)
      return res
        .status(400)
        .json({ success: false, message: "Month is required" });

    const events = await ScheduleEvent.find({
      userId,
      date: { $regex: `^${month}` },
    })
      .sort({ date: 1, startTime: 1 })
      .lean();

    const enriched = await enrichEvents(events);

    res.json({ success: true, events: enriched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------------- GET ADMIN SCHEDULE ----------------
export const getAdminSchedule = async (req, res) => {
  try {
    const { month, userId } = req.query;
    if (!month)
      return res
        .status(400)
        .json({ success: false, message: "Month is required" });

    const filter = { date: { $regex: `^${month}` } };
    if (userId && userId !== "all") filter.userId = userId;

    const events = await ScheduleEvent.find(filter)
      .populate("userId", "name avatar")
      .sort({ date: 1, startTime: 1 })
      .lean();

    const enriched = await enrichEvents(events);

    res.json({ success: true, events: enriched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------------- CREATE EVENT ----------------
export const createScheduleEvent = async (req, res) => {
  try {
    const { userId, source = "manual" } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User is required",
      });
    }

    const isAdmin = req.user.role === "admin";
    const isSelf = req.user._id.toString() === userId.toString();

    if (!isAdmin && (!isSelf || source !== "manual")) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to create this event",
      });
    }

    const event = new ScheduleEvent({
      ...req.body,
      createdBy: req.user._id,
    });

    await event.save();

    const populatedEvent = await ScheduleEvent.findById(event._id)
      .populate("userId", "name avatar")
      .lean();

    const enriched = await enrichEvents([populatedEvent]);
    const createdEvent = enriched[0];
    // ====== NOTIFICATIONS ON EVENT CREATE ======
    try {
      const creatorName = req.user.name || "Admin";
      const user = await User.findById(createdEvent.userId).lean();
      const eventDate = new Date(createdEvent.date).toLocaleDateString("en-GB");

      await sendNotification(
        createdEvent.userId,
        "user",
        "New Workout Scheduled 📅",
        `${creatorName} has scheduled "${
          createdEvent.sourceName || "Manual Workout"
        }" for you on ${eventDate}.`,
        "success",
        "calendar"
      );

      // 2. Notification to all Admins
      const admins = await User.find({ role: "admin" });
      for (const admin of admins) {
        await sendNotification(
          admin._id,
          "admin",
          "New Schedule Event Created",
          `New event scheduled for ${user?.name || "a member"}: "${
            createdEvent.sourceName || "Manual Workout"
          }" on ${eventDate}.`,
          "success",
          "calendar"
        );
      }
    } catch (notifyErr) {
      console.error("Schedule create notification error:", notifyErr);
    }
    res.status(201).json({ success: true, event: enriched[0] });
  } catch (err) {
    console.error("Create error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------------- UPDATE EVENT ----------------
export const updateScheduleEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await ScheduleEvent.findById(id);
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    const isOwner = event.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    Object.assign(event, req.body);
    await event.save();

    const populatedEvent = await ScheduleEvent.findById(event._id)
      .populate("userId", "name avatar")
      .lean();

    const enriched = await enrichEvents([populatedEvent]);
    const updatedEvent = enriched[0];

    // ====== NOTIFICATIONS ON EVENT UPDATE ======
    try {
      const updaterName = req.user.name || "Admin";
      const eventDate = new Date(updatedEvent.date).toLocaleDateString("en-GB");

      // User notification
      await sendNotification(
        updatedEvent.userId,
        "user",
        "Schedule Updated 📅",
        `${updaterName} has updated your scheduled "${
          updatedEvent.sourceName || "Workout"
        }" on ${eventDate}.`,
        "neutral",
        "calendar"
      );

      // Admins notification
      const admins = await User.find({ role: "admin" });
      for (const admin of admins) {
        await sendNotification(
          admin._id,
          "admin",
          "Schedule Event Updated",
          `Schedule updated: "${
            updatedEvent.sourceName || "Manual Workout"
          }" on ${eventDate}.`,
          "neutral",
          "calendar"
        );
      }
    } catch (notifyErr) {
      console.error("Schedule update notification error:", notifyErr);
    }
    res.json({ success: true, event: enriched[0] });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE EVENT
export const deleteScheduleEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await ScheduleEvent.findById(id);
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    const isOwner = event.userId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    await ScheduleEvent.findByIdAndDelete(id);
    res.json({ success: true, message: "Event deleted" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------------- MARK EVENT COMPLETED ----------------
export const markEventCompleted = async (req, res) => {
  try {
    const { id } = req.params;

    const event = await ScheduleEvent.findById(id);
    if (!event)
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });

    if (
      event.userId.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    )
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });

    event.completed = true;
    await event.save();
    // ====== NOTIFICATION ON COMPLETION ======
    try {
      const user = await User.findById(req.user._id).lean();
      const eventDate = new Date(event.date).toLocaleDateString("en-GB");

      // User celebration notification
      await sendNotification(
        req.user._id,
        "user",
        "Workout Completed! 🎉",
        `Great job! You have successfully completed "${
          event.sourceName || "Workout"
        }" on ${eventDate}.`,
        "success",
        "calendar"
      );

      // Admins notification
      const admins = await User.find({ role: "admin" });
      for (const admin of admins) {
        await sendNotification(
          admin._id,
          "admin",
          "Member Completed Scheduled Workout",
          `${user?.name || "A member"} completed their scheduled event: "${
            event.sourceName || "Manual Workout"
          }".`,
          "success",
          "calendar"
        );
      }
    } catch (notifyErr) {
      console.error("Complete event notification error:", notifyErr);
    }

    res.json({ success: true, event });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ---------------- DELETE EVENTS BY SOURCE ----------------
export const deleteEventsBySource = async (req, res) => {
  try {
    const { sourceType, sourceId } = req.params;
    if (!["program", "challenge", "class"].includes(sourceType))
      return res
        .status(400)
        .json({ success: false, message: "Invalid source type" });

    const fieldMap = {
      program: "programId",
      challenge: "challengeId",
      class: "classId",
    };
    await ScheduleEvent.deleteMany({ [fieldMap[sourceType]]: sourceId });

    res.json({ success: true, message: `All ${sourceType} events deleted` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
