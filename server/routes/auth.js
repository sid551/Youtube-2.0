import express from "express";
import {
  login,
  verifyOtp,
  getUser,
  updateprofile,
  updatePlan,
  updateTheme,
  createOrder,
  verifyPayment,
  toggleSubscribe,
  getSubscribeStatus,
  getUserSubscriptions,
} from "../controllers/auth.js";
const routes = express.Router();

routes.post("/login", login);
routes.post("/verify-otp", verifyOtp);
routes.patch("/update/:id", updateprofile);
routes.patch("/plan/:id", updatePlan);
routes.patch("/theme/:id", updateTheme);

// Razorpay subscription — must come before /:id
routes.post("/subscription/order", createOrder);
routes.post("/subscription/verify", verifyPayment);

// Channel subscribe — must come before /:id
routes.post("/subscribe/:channelId", toggleSubscribe);
routes.get("/subscribe/status/:channelId", getSubscribeStatus);
routes.get("/subscriptions/:userId", getUserSubscriptions);

// Generic user lookup — keep last to avoid swallowing named routes
routes.get("/:id", getUser);

export default routes;
