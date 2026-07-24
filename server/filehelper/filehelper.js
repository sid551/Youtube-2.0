"use strict";
import multer from "multer";

const storage = multer.memoryStorage();

const filefilter = (req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("video/")) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: filefilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max file size for MongoDB storage
});

export default upload;
