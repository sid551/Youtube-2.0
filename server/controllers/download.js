import path from "path";
import fs from "fs";
import download from "../Modals/download.js";
import video from "../Modals/video.js";
import users from "../Modals/Auth.js";
import { PLAN_FEATURES } from "./auth.js";

// Count how many downloads a user has made today
const todayCount = async (userId) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return download.countDocuments({
    viewer: userId,
    createdAt: { $gte: start },
  });
};

// POST /download/:videoId  — record + stream file
export const downloadVideo = async (req, res) => {
  const { videoId } = req.params;
  const { userId } = req.body;

  if (!userId) return res.status(401).json({ message: "Sign in to download" });

  try {
    const user = await users.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const plan = user.plan || "free";
    const features = PLAN_FEATURES[plan];
    const limit = features.downloads; // null = unlimited
    const used = await todayCount(userId);

    if (limit !== null && used >= limit) {
      return res.status(429).json({
        message:
          plan === "free"
            ? "Free plan allows 1 download per day. Upgrade to download more."
            : `Your ${plan} plan allows ${limit} downloads per day. Limit reached.`,
        limit,
        used,
        plan,
      });
    }

    const found = await video.findById(videoId);
    if (!found) return res.status(404).json({ message: "Video not found" });

    const filePath = path.resolve(found.filepath);
    if (!fs.existsSync(filePath)) {
      return res
        .status(404)
        .json({ message: "Video file not found on server" });
    }

    // Record the download before streaming
    await download.create({ viewer: userId, videoid: videoId });

    const filename =
      encodeURIComponent(found.videotitle || found.filename) + ".mp4";
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "video/mp4");
    fs.createReadStream(filePath).pipe(res);
  } catch (error) {
    console.error("Download error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// GET /download/list/:userId  — list all downloads for a user
export const getDownloads = async (req, res) => {
  const { userId } = req.params;
  try {
    const downloads = await download
      .find({ viewer: userId })
      .populate({ path: "videoid", model: "videofiles" })
      .sort({ createdAt: -1 });
    return res.status(200).json(downloads);
  } catch (error) {
    console.error("error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// GET /download/quota/:userId  — return today's usage + limit
export const getQuota = async (req, res) => {
  const { userId } = req.params;
  try {
    const user = await users.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const plan = user.plan || "free";
    const features = PLAN_FEATURES[plan];
    const limit = features.downloads; // null = unlimited
    const used = await todayCount(userId);

    return res.status(200).json({ plan, limit, used });
  } catch (error) {
    console.error("error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// PATCH /download/plan/:userId — kept for backwards compat, delegates to user plan
export const updatePlan = async (req, res) => {
  const { userId } = req.params;
  const { plan } = req.body;
  if (!["free", "bronze", "silver", "gold"].includes(plan))
    return res.status(400).json({ message: "Invalid plan" });
  try {
    const now = new Date();
    const expiresAt =
      plan === "free"
        ? null
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const updated = await users.findByIdAndUpdate(
      userId,
      {
        $set: {
          plan,
          planStartDate: plan === "free" ? null : now,
          planExpiresAt: expiresAt,
        },
      },
      { new: true }
    );
    return res
      .status(200)
      .json({ plan: updated.plan, planExpiresAt: updated.planExpiresAt });
  } catch (error) {
    console.error("error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
