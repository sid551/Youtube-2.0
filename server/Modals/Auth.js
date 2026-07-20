import mongoose from "mongoose";
const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  // free: 1 download/day | premium: 5/day | pro: unlimited
  plan: { type: String, enum: ["free", "premium", "pro"], default: "free" },
  planStartDate: { type: Date, default: null },
  planExpiresAt: { type: Date, default: null },
  joinedon: { type: Date, default: Date.now },
});

export default mongoose.model("user", userschema);
