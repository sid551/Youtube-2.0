import mongoose from "mongoose";

const userschema = mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, default: "" },
    channelname: { type: String, index: true, default: "" },
    description: { type: String, default: "" },
    image: { type: String, default: "" },
    plan: {
      type: String,
      enum: ["free", "bronze", "silver", "gold"],
      default: "free",
    },
    planStartDate: { type: Date, default: null },
    planExpiresAt: { type: Date, default: null },
    subscribers: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    subscribedChannels: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
    theme: {
      type: String,
      enum: ["light", "dark"],
      default: null,
    },
    themePreference: {
      type: String,
      enum: ["light", "dark"],
      default: null,
    },
    lastDevice: {
      browser: { type: String, default: null },
      os: { type: String, default: null },
      userAgent: { type: String, default: null },
    },
    lastLocation: {
      city: { type: String, default: null },
      state: { type: String, default: null },
      country: { type: String, default: null },
      ip: { type: String, default: null },
    },
    otp: {
      code: { type: String, default: null },
      expiresAt: { type: Date, default: null },
    },
    joinedon: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("user", userschema);
