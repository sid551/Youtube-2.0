import video from "../Modals/video.js";
import history from "../Modals/history.js";

export const handlehistory = async (req, res) => {
  const { userId } = req.body;
  const { videoId } = req.params;
  if (!userId || !videoId) {
    return res.status(400).json({ message: "userId and videoId are required" });
  }
  try {
    const existingHistory = await history.findOne({
      viewer: userId,
      videoid: videoId,
    });

    if (existingHistory) {
      existingHistory.createdAt = new Date();
      await existingHistory.save();
    } else {
      await history.create({ viewer: userId, videoid: videoId });
    }

    await video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
    return res.status(200).json({ history: true });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const handleview = async (req, res) => {
  const { videoId } = req.params;
  try {
    await video.findByIdAndUpdate(videoId, { $inc: { views: 1 } });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallhistoryVideo = async (req, res) => {
  const { userId } = req.params;
  try {
    const historyvideo = await history
      .find({ viewer: userId })
      .sort({ createdAt: -1 })
      .populate({
        path: "videoid",
        model: "videofiles",
      })
      .exec();

    // Deduplicate by video ID so each video appears only once (most recent view)
    const seenVideoIds = new Set();
    const uniqueHistory = [];

    for (const item of historyvideo) {
      if (item && item.videoid && item.videoid._id) {
        const vIdStr = item.videoid._id.toString();
        if (!seenVideoIds.has(vIdStr)) {
          seenVideoIds.add(vIdStr);
          uniqueHistory.push(item);
        }
      }
    }

    return res.status(200).json(uniqueHistory);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const deletehistory = async (req, res) => {
  const { historyId } = req.params;
  try {
    const item = await history.findById(historyId);
    if (item) {
      await history.deleteMany({ viewer: item.viewer, videoid: item.videoid });
    } else {
      await history.findByIdAndDelete(historyId);
    }
    return res.status(200).json({ message: "Removed from history" });
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
