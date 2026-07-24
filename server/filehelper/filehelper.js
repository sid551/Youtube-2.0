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
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max file size (MongoDB BSON max limit is 16MB)
});

export default upload;
