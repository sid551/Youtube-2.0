import mongoose from "mongoose";
const userschema = mongoose.Schema({
  email: { type: String, required: true },
  name: { type: String },
  channelname: { type: String },
  description: { type: String },
  image: { type: String },
  plan: {
    type: String,
    enum: ["free", "bronze", "silver", "gold"],
    default: "free",
  },
  planStartDate: { type: Date, default: null },
  planExpiresAt: { type: Date, default: null },
  joinedon: { type: Date, default: Date.now },
});

export default mongoose.model("user", userschema);
