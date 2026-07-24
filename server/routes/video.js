import express from "express";
import { getallvideo, uploadvideo, streamvideo } from "../controllers/video.js";
import upload from "../filehelper/filehelper.js";

const routes = express.Router();

routes.post(
  "/upload",
  (req, res, next) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            message: "Video file size exceeds maximum 15MB limit for direct database storage.",
          });
        }
        return res
          .status(400)
          .json({ message: err.message || "File upload error" });
      }
      next();
    });
  },
  uploadvideo
);
routes.get("/getall", getallvideo);
routes.get("/stream/:id", streamvideo);

export default routes;
