import express from "express";
import {
  login,
  getUser,
  updateprofile,
  updatePlan,
  createOrder,
  verifyPayment,
} from "../controllers/auth.js";
const routes = express.Router();

routes.post("/login", login);
routes.get("/:id", getUser);
routes.patch("/update/:id", updateprofile);
routes.patch("/plan/:id", updatePlan);

// Razorpay subscription
routes.post("/subscription/order", createOrder);
routes.post("/subscription/verify", verifyPayment);

export default routes;
