import Notification from "../models/Notification.js";
export const sendNotification = async (
  recipientId,
  role,
  title,
  message,
  type = "neutral",
  icon = "bell"
) => {
  try {
    console.log("🚀 sendNotification called");
    console.log(`   Recipient: ${recipientId} | Role: ${role}`);
    console.log(`   Title: ${title}`);
    console.log(`   Message: ${message}`);
    console.log(`   Type: ${type} | Icon: ${icon}`);

    const notificationData = {
      title,
      message,
      type,
      icon,
      isRead: false,
    };

    if (role === "admin") {
      notificationData.admin = recipientId;
    } else {
      notificationData.user = recipientId;
    }

    console.log("📝 Creating notification in DB...");
    const notification = await Notification.create(notificationData);
    console.log("✅ Notification saved in DB:", notification._id);

    const room =
      role === "admin" ? `admin_${recipientId}` : `user_${recipientId}`;
    console.log(`📡 Emitting to room: ${room}`);

    if (global.io) {
      console.log("🔌 Socket.IO available – emitting event");
      global.io.to(room).emit("notification:new", notification);
      console.log("📤 Event emitted: notification:new");
    } else {
      console.warn("⚠️ global.io is NOT available – Socket not initialized!");
    }

    return notification;
  } catch (error) {
    console.error(`❌ Error sending ${role} notification:`, error);
    console.error("Full error:", error.stack);
    throw error;
  }
};
