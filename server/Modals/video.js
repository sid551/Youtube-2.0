import mongoose from "mongoose";

const videochema = mongoose.Schema(
  {
    videotitle: { type: String, required: true, index: true },
    filename: { type: String, required: true },
    filetype: { type: String, required: true },
    filepath: { type: String },
    filesize: { type: String, required: true },
    videochanel: { type: String, required: true, index: true },
    Like: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
    uploader: { type: String, index: true },
    gridfsId: { type: mongoose.Schema.Types.ObjectId, default: null },
    videodata: { type: Buffer },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("videofiles", videochema);
