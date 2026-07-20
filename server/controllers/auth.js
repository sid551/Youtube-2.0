import mongoose from "mongoose";
import users from "../Modals/Auth.js";

// Plan feature definitions (single source of truth)
export const PLAN_FEATURES = {
  free: {
    price: 0,
    label: "Free",
    downloads: 1,
    quality: "SD",
    ads: true,
    badge: null,
  },
  premium: {
    price: 99,
    label: "Premium",
    downloads: 5,
    quality: "HD",
    ads: false,
    badge: "Premium",
  },
  pro: {
    price: 199,
    label: "Pro",
    downloads: null, // unlimited
    quality: "4K",
    ads: false,
    badge: "Pro",
  },
};

export const login = async (req, res) => {
  const { email, name, image } = req.body;
  try {
    const existingUser = await users.findOne({ email });
    if (!existingUser) {
      const newUser = await users.create({ email, name, image });
      return res.status(201).json({ result: newUser });
    }
    // Auto-expire plan if past expiry date
    if (
      existingUser.plan !== "free" &&
      existingUser.planExpiresAt &&
      new Date() > existingUser.planExpiresAt
    ) {
      existingUser.plan = "free";
      existingUser.planStartDate = null;
      existingUser.planExpiresAt = null;
      await existingUser.save();
    }
    return res.status(200).json({ result: existingUser });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const getUser = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(404).json({ message: "User not found" });
  try {
    const user = await users.findById(id);
    if (!user) return res.status(404).json({ message: "User not found" });
    return res.status(200).json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { channelname, description } = req.body;
  if (!mongoose.Types.ObjectId.isValid(_id))
    return res.status(500).json({ message: "User unavailable..." });
  try {
    const updatedata = await users.findByIdAndUpdate(
      _id,
      { $set: { channelname, description } },
      { new: true }
    );
    return res.status(201).json(updatedata);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// PATCH /user/plan/:id — subscribe / change / cancel plan
export const updatePlan = async (req, res) => {
  const { id } = req.params;
  const { plan } = req.body;
  if (!["free", "premium", "pro"].includes(plan))
    return res.status(400).json({ message: "Invalid plan" });
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(404).json({ message: "User not found" });
  try {
    const now = new Date();
    // Plans expire after 30 days; free has no expiry
    const expiresAt =
      plan === "free"
        ? null
        : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const updated = await users.findByIdAndUpdate(
      id,
      {
        $set: {
          plan,
          planStartDate: plan === "free" ? null : now,
          planExpiresAt: expiresAt,
        },
      },
      { new: true }
    );
    return res.status(200).json({
      plan: updated.plan,
      planStartDate: updated.planStartDate,
      planExpiresAt: updated.planExpiresAt,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
