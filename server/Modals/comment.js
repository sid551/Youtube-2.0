import mongoose from "mongoose";
const commentschema = mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },
    videoid: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "videofiles",
      required: true,
    },
    commentbody: { type: String },
    usercommented: { type: String },
    commentedon: { type: Date, default: Date.now },
    location: { type: String, default: null }, // country only, optional
    // language code detected on post e.g. "en", "fr"
    language: { type: String, default: "en" },
    // arrays of user IDs who liked/disliked/reported
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    dislikes: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    reports: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
        reason: { type: String },
        customReason: { type: String, default: null }, // only set when reason === "other"
        reportedAt: { type: Date, default: Date.now },
      },
    ],
    // flagged for review when report count hits threshold
    flagged: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("comment", commentschema);
