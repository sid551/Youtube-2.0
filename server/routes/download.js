import express from "express";
import {
  downloadVideo,
  getDownloads,
  getQuota,
  updatePlan,
} from "../controllers/download.js";

const routes = express.Router();

routes.get("/list/:userId", getDownloads);
routes.get("/quota/:userId", getQuota);
routes.patch("/plan/:userId", updatePlan);
routes.post("/:videoId", downloadVideo);

export default routes;
