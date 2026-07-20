import mongoose from "mongoose";

const notificationSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    message: { type: String, required: true },
    videoid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      default: null,
    },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("notification", notificationSchema);
