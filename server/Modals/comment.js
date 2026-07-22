import mongoose from "mongoose";

const commentschema = mongoose.Schema(
  {
    userid: {
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
    commentbody: { type: String, required: true },
    usercommented: { type: String, default: "Anonymous" },
    commentedon: { type: Date, default: Date.now },
    location: { type: String, default: null },
    language: { type: String, default: "en" },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    reports: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        reason: { type: String },
        customReason: { type: String, default: null },
        reportedAt: { type: Date, default: Date.now },
      },
    ],
    flagged: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("comment", commentschema);
