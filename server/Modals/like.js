import mongoose from "mongoose";

const likeschema = mongoose.Schema(
  {
    viewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
      index: true,
    },
    videoid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

likeschema.index({ viewer: 1, videoid: 1 }, { unique: true });

export default mongoose.model("like", likeschema);
