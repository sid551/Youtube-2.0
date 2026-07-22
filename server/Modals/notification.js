import mongoose from "mongoose";

const notificationSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    message: { type: String, required: true },
    videoid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      default: null,
      index: true,
    },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, read: 1 });

export default mongoose.model("notification", notificationSchema);
