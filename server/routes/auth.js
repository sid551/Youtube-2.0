import express from "express";
import {
  login,
  getUser,
  updateprofile,
  updatePlan,
} from "../controllers/auth.js";
const routes = express.Router();

routes.post("/login", login);
routes.get("/:id", getUser);
routes.patch("/update/:id", updateprofile);
routes.patch("/plan/:id", updatePlan);
export default routes;
