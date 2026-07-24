import mongoose from "mongoose";
import notification from "../Modals/notification.js";
import users from "../Modals/Auth.js";

// GET /notification/:userId — fetch latest 20 notifications
export const getNotifications = async (req, res) => {
  const { userId } = req.params;
  try {
    const notifications = await notification
      .find({ userId })
      .populate({ path: "videoid", model: "videofiles" })
      .sort({ createdAt: -1 })
      .limit(20);
    return res.status(200).json(notifications);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// PATCH /notification/read/:userId — mark all as read
export const markAllRead = async (req, res) => {
  const { userId } = req.params;
  try {
    await notification.updateMany(
      { userId, read: false },
      { $set: { read: true } }
    );
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// Called internally after a video upload to fan-out notifications to all users
export const createUploadNotification = async (
  uploaderId,
  videoId,
  videoTitle
) => {
  try {
    const isIdValid = uploaderId && mongoose.Types.ObjectId.isValid(uploaderId);
    const filter = isIdValid ? { _id: { $ne: uploaderId } } : {};
    const allUsers = await users.find(filter, "_id");
    const docs = allUsers.map((u) => ({
      userId: u._id,
      message: `New video uploaded: "${videoTitle || "Untitled"}"`,
      videoid: videoId,
      read: false,
    }));
    if (docs.length) await notification.insertMany(docs);
  } catch (error) {
    console.error("Notification fan-out error:", error);
  }
};
