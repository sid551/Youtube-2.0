import express from "express";
import { getNotifications, markAllRead } from "../controllers/notification.js";

const routes = express.Router();

routes.get("/:userId", getNotifications);
routes.patch("/read/:userId", markAllRead);

export default routes;
