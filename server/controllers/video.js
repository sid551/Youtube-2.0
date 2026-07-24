import video from "../Modals/video.js";
import { createUploadNotification } from "./notification.js";

export const uploadvideo = async (req, res) => {
  if (req.file === undefined) {
    return res
      .status(404)
      .json({ message: "plz upload a mp4 video file only" });
  }
  try {
    const normalizedFilePath = req.file.path.replace(/\\/g, "/");

    const file = new video({
      videotitle: req.body.videotitle,
      filename: req.file.originalname,
      filepath: normalizedFilePath,
      filetype: req.file.mimetype,
      filesize: req.file.size,
      videochanel: req.body.videochanel,
      uploader: req.body.uploader,
    });
    await file.save();
    // Fan-out upload notification to all other users (non-blocking)
    createUploadNotification(req.body.uploader, file._id, req.body.videotitle);
    return res.status(201).json("file uploaded successfully");
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getallvideo = async (req, res) => {
  try {
    const files = await video.find();
    return res.status(200).send(files);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
