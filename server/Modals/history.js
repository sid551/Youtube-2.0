import mongoose from "mongoose";

const historyschema = mongoose.Schema(
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

historyschema.index({ viewer: 1, videoid: 1 });

export default mongoose.model("history", historyschema);
