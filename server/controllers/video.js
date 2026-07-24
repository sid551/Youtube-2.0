import fs from "fs";
import path from "path";
import { Readable } from "stream";
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
    const diskPath = req.file.path ? req.file.path.replace(/\\/g, "/") : null;

    // Initialize GridFSBucket
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: "videos",
    });

    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
    });

    const fileStream = req.file.path
      ? fs.createReadStream(req.file.path)
      : Readable.from(req.file.buffer);

    fileStream.pipe(uploadStream);

    uploadStream.on("finish", async () => {
      try {
        const newVideo = new video({
          videotitle: req.body.videotitle || req.file.originalname,
          filename: req.file.originalname,
          filetype: req.file.mimetype,
          filesize: req.file.size.toString(),
          videochanel: req.body.videochanel || "Guest Channel",
          uploader: req.body.uploader || "guest",
          gridfsId: uploadStream.id,
          filepath: diskPath || `video/stream/${uploadStream.id}`,
        });

        // Update filepath to standard stream route
        newVideo.filepath = `video/stream/${newVideo._id}`;
        await newVideo.save();

        createUploadNotification(req.body.uploader, newVideo._id, req.body.videotitle);
        return res.status(201).json({ message: "File uploaded successfully", video: newVideo });
      } catch (saveErr) {
        console.error("Video save error:", saveErr);
        return res.status(500).json({ message: "Error saving video entry", error: saveErr.message });
      }
    });

    uploadStream.on("error", (err) => {
      console.error("GridFS upload error:", err);
      return res.status(500).json({ message: "Error uploading video to database", error: err.message });
    });
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

    // 1. External HTTPS URL
    if (videoFile.filepath && (videoFile.filepath.startsWith("http://") || videoFile.filepath.startsWith("https://"))) {
      return res.redirect(videoFile.filepath);
    }

    // 2. Stream from MongoDB GridFS bucket if gridfsId exists
    if (videoFile.gridfsId) {
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
        bucketName: "videos",
      });

      const gridfsId = new mongoose.Types.ObjectId(videoFile.gridfsId);
      const files = await bucket.find({ _id: gridfsId }).toArray();

      if (files.length > 0) {
        const file = files[0];
        const fileSize = file.length;
        const range = req.headers.range;
        const mimeType = videoFile.filetype || file.contentType || "video/mp4";

        if (range) {
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunksize = end - start + 1;

          res.writeHead(206, {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunksize,
            "Content-Type": mimeType,
          });

          const downloadStream = bucket.openDownloadStream(gridfsId, { start, end: end + 1 });
          return downloadStream.pipe(res);
        } else {
          res.writeHead(200, {
            "Content-Length": fileSize,
            "Content-Type": mimeType,
          });
          return bucket.openDownloadStream(gridfsId).pipe(res);
        }
      }
    }

    // 3. Fallback: Stream from local disk file if filepath exists on disk
    let localDiskPath = videoFile.filepath;
    if (localDiskPath) {
      const fullPath = path.resolve(process.cwd(), localDiskPath);
      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        const fileSize = stat.size;
        const range = req.headers.range;
        const mimeType = videoFile.filetype || "video/mp4";

        if (range) {
          const parts = range.replace(/bytes=/, "").split("-");
          const start = parseInt(parts[0], 10);
          const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
          const chunksize = end - start + 1;
          const stream = fs.createReadStream(fullPath, { start, end });

          res.writeHead(206, {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": chunksize,
            "Content-Type": mimeType,
          });
          return stream.pipe(res);
        } else {
          res.writeHead(200, {
            "Content-Length": fileSize,
            "Content-Type": mimeType,
          });
          return fs.createReadStream(fullPath).pipe(res);
        }
      }
    }

    // 4. Fallback: Stream binary video directly from legacy MongoDB buffer
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

    return res.status(404).json({ message: "No video data found" });
  } catch (error) {
    console.error("Stream video error:", error);
    return res.status(500).json({ message: "Error streaming video" });
  }
};
