import comment from "../Modals/comment.js";
import mongoose from "mongoose";
import { Filter } from "bad-words";

// bad-words filter with built-in dictionary (~1400 words) + our extras
const filter = new Filter();
filter.addWords(
  "kys",
  "kill yourself",
  "go die",
  "i will kill",
  "i'll kill",
  "gonna kill",
  "i will hurt",
  "gonna hurt",
  "i will find you",
  "mofo",
  "dumbass",
  "jackass",
  "dipshit",
  "a55hole",
  "sh1t",
  "b1tch",
  "c0ck",
  "wh0re",
  "n!gger",
  "ret*rd",
  "f u c k",
  "idiot",
  "moron",
  "imbecile",
  "loser",
  "hate you"
);

// --- Structural spam checks ---
const SPAM_PATTERN = /(.)\1{6,}/;
const SPECIAL_CHAR_SPAM = /^[^a-zA-Z0-9\s]{4,}$/;

// --- Combined moderation (fully local, no network) ---
const moderateComment = (text) => {
  if (SPAM_PATTERN.test(text)) return "spam";
  if (SPECIAL_CHAR_SPAM.test(text.trim())) return "invalid comment format";
  if (filter.isProfane(text)) return "abusive language";
  return null;
};

// --- Post comment ---
export const postcomment = async (req, res) => {
  const { commentbody, language = "en", ...rest } = req.body;

  const blocked = moderateComment(commentbody || "");
  if (blocked) {
    return res.status(400).json({ blocked: true, reason: blocked });
  }

  try {
    const newComment = new comment({ ...rest, commentbody, language });
    await newComment.save();
    return res.status(200).json({ comment: true, data: newComment });
  } catch (error) {
    console.error("error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// --- Get all comments for a video ---
export const getallcomment = async (req, res) => {
  const { videoid } = req.params;
  try {
    const comments = await comment
      .find({ videoid, flagged: false })
      .sort({ createdAt: -1 });
    return res.status(200).json(comments);
  } catch (error) {
    console.error("error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// --- Delete comment ---
export const deletecomment = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id))
    return res.status(404).send("comment unavailable");
  try {
    await comment.findByIdAndDelete(_id);
    return res.status(200).json({ comment: true });
  } catch (error) {
    console.error("error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// --- Edit comment ---
export const editcomment = async (req, res) => {
  const { id: _id } = req.params;
  const { commentbody } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id))
    return res.status(404).send("comment unavailable");

  const blocked = moderateComment(commentbody || "");
  if (blocked) {
    return res.status(400).json({ blocked: true, reason: blocked });
  }

  try {
    const updated = await comment.findByIdAndUpdate(
      _id,
      { $set: { commentbody } },
      { new: true }
    );
    return res.status(200).json(updated);
  } catch (error) {
    console.error("error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// --- Like / unlike a comment ---
export const likecomment = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(404).send("comment unavailable");
  try {
    const found = await comment.findById(id);
    if (!found) return res.status(404).json({ message: "Not found" });

    const uid = new mongoose.Types.ObjectId(userId);
    const alreadyLiked = found.likes.some((l) => l.equals(uid));

    if (alreadyLiked) {
      found.likes.pull(uid);
    } else {
      found.likes.addToSet(uid);
      found.dislikes.pull(uid);
    }
    await found.save();
    return res
      .status(200)
      .json({ likes: found.likes.length, dislikes: found.dislikes.length });
  } catch (error) {
    console.error("error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// --- Dislike / un-dislike a comment ---
export const dislikecomment = async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(404).send("comment unavailable");
  try {
    const found = await comment.findById(id);
    if (!found) return res.status(404).json({ message: "Not found" });

    const uid = new mongoose.Types.ObjectId(userId);
    const alreadyDisliked = found.dislikes.some((d) => d.equals(uid));

    if (alreadyDisliked) {
      found.dislikes.pull(uid);
    } else {
      found.dislikes.addToSet(uid);
      found.likes.pull(uid);
    }
    await found.save();
    return res
      .status(200)
      .json({ likes: found.likes.length, dislikes: found.dislikes.length });
  } catch (error) {
    console.error("error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// --- Report a comment (flag after 3 reports) ---
const REPORT_THRESHOLD = 3;

export const reportcomment = async (req, res) => {
  const { id } = req.params;
  const { userId, reason, customReason } = req.body;
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(404).send("comment unavailable");
  try {
    const found = await comment.findById(id);
    if (!found) return res.status(404).json({ message: "Not found" });

    const uid = new mongoose.Types.ObjectId(userId);
    const alreadyReported = found.reports.some((r) => r.userId?.equals(uid));
    if (alreadyReported) {
      return res.status(200).json({ message: "Already reported" });
    }

    found.reports.push({
      userId: uid,
      reason: reason || "other",
      customReason: reason === "other" && customReason ? customReason : null,
      reportedAt: new Date(),
    });
    if (found.reports.length >= REPORT_THRESHOLD) {
      found.flagged = true;
    }
    await found.save();
    return res.status(200).json({ reported: true, flagged: found.flagged });
  } catch (error) {
    console.error("error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
