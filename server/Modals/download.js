import mongoose from "mongoose";

const downloadschema = mongoose.Schema(
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
  { timestamps: true }
);

downloadschema.index({ viewer: 1, videoid: 1 });

export default mongoose.model("download", downloadschema);
