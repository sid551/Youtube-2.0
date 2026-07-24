import mongoose from "mongoose";
import video from "../Modals/video.js";
import { createUploadNotification } from "./notification.js";

export const uploadvideo = async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ message: "Please upload a valid video file (.mp4, .webm, etc.)" });
  }
  try {
    const newVideo = new video({
      videotitle: req.body.videotitle || req.file.originalname,
      filename: req.file.originalname,
      filetype: req.file.mimetype,
      filesize: req.file.size.toString(),
      videochanel: req.body.videochanel || "Guest Channel",
      uploader: req.body.uploader || "guest",
      videodata: req.file.buffer, // Binary stored directly in MongoDB
    });

    // Set filepath point to MongoDB streaming endpoint
    newVideo.filepath = `video/stream/${newVideo._id}`;
    await newVideo.save();

    // Fan-out upload notification to all other users (non-blocking)
    createUploadNotification(req.body.uploader, newVideo._id, req.body.videotitle);
    return res.status(201).json({ message: "File uploaded and stored in MongoDB successfully", video: newVideo });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ message: "Something went wrong during video upload", error: error.message });
  }
};

export const getallvideo = async (req, res) => {
  try {
    // Exclude heavy binary videodata field for fast listing performance
    const files = await video.find().select("-videodata").sort({ createdAt: -1 });
    return res.status(200).send(files);
  } catch (error) {
    console.error("Get all videos error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const streamvideo = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid video id" });
  }

  try {
    const videoFile = await video.findById(id);
    if (!videoFile) {
      return res.status(404).json({ message: "Video not found in database" });
    }

    // Redirect to external HTTPS URL if filepath is an external link
    if (videoFile.filepath && (videoFile.filepath.startsWith("http://") || videoFile.filepath.startsWith("https://"))) {
      return res.redirect(videoFile.filepath);
    }

    // Stream binary video directly from MongoDB with HTTP range support
    if (videoFile.videodata) {
      const buffer = videoFile.videodata;
      const fileSize = buffer.length;
      const range = req.headers.range;
      const mimeType = videoFile.filetype || "video/mp4";

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;
        const chunk = buffer.subarray(start, end + 1);

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize,
          "Content-Type": mimeType,
        });
        return res.end(chunk);
      } else {
        res.writeHead(200, {
          "Content-Length": fileSize,
          "Content-Type": mimeType,
        });
        return res.end(buffer);
      }
    }

    return res.status(404).json({ message: "No video data found in database" });
  } catch (error) {
    console.error("Stream video error:", error);
    return res.status(500).json({ message: "Error streaming video from MongoDB" });
  }
};
