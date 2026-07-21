import mongoose from "mongoose";
import Razorpay from "razorpay";
import crypto from "crypto";
import nodemailer from "nodemailer";
import users from "../Modals/Auth.js";

// Plan feature definitions (single source of truth)
export const PLAN_FEATURES = {
  free: {
    price: 0,
    label: "Free",
    downloads: 1,
    quality: "SD (480p)",
    ads: true,
    badge: null,
  },
  bronze: {
    price: 49,
    label: "Bronze",
    downloads: 5,
    quality: "HD (720p)",
    ads: true,
    badge: "Bronze",
  },
  silver: {
    price: 99,
    label: "Silver",
    downloads: 15,
    quality: "Full HD (1080p)",
    ads: false,
    badge: "Silver",
  },
  gold: {
    price: 199,
    label: "Gold",
    downloads: null, // unlimited
    quality: "4K Ultra HD",
    ads: false,
    badge: "Gold",
  },
};

// ── Lazily initialized singletons (avoid crash on missing env vars) ──
let _razorpay = null;
const getRazorpay = () => {
  if (!_razorpay) {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      throw new Error(
        "RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in .env"
      );
    }
    _razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
};

let _transporter = null;
const getTransporter = () => {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
    // Verify connection config on first use
    _transporter.verify((err) => {
      if (err) console.error("Email transporter error:", err.message);
      else console.log("Email transporter ready");
    });
  }
  return _transporter;
};

const sendInvoiceEmail = async ({
  toEmail,
  userName,
  plan,
  orderId,
  paymentId,
  amount,
}) => {
  const planInfo = PLAN_FEATURES[plan];
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <div style="background:#dc2626;padding:24px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:24px">YourTube</h1>
        <p style="color:#fecaca;margin:4px 0 0">Subscription Confirmation</p>
      </div>
      <div style="padding:32px">
        <p style="font-size:16px;color:#111827">Hi <strong>${userName}</strong>,</p>
        <p style="color:#374151">Your subscription to the <strong>${
          planInfo.label
        } Plan</strong> is now active.</p>
        <div style="background:#f9fafb;border-radius:8px;padding:20px;margin:24px 0">
          <h3 style="margin:0 0 16px;color:#111827">Invoice Details</h3>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:6px 0;color:#6b7280">Plan</td><td style="padding:6px 0;font-weight:600;color:#111827">${
              planInfo.label
            }</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280">Amount Paid</td><td style="padding:6px 0;font-weight:600;color:#16a34a">₹${amount}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280">Order ID</td><td style="padding:6px 0;color:#374151">${orderId}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280">Payment ID</td><td style="padding:6px 0;color:#374151">${paymentId}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280">Valid From</td><td style="padding:6px 0;color:#374151">${now.toDateString()}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280">Valid Until</td><td style="padding:6px 0;color:#374151">${expiresAt.toDateString()}</td></tr>
          </table>
        </div>
        <h3 style="color:#111827">Plan Benefits</h3>
        <ul style="color:#374151;font-size:14px;line-height:1.8">
          <li>Downloads per day: <strong>${
            planInfo.downloads ?? "Unlimited"
          }</strong></li>
          <li>Video quality: <strong>${planInfo.quality}</strong></li>
          <li>Ad-free: <strong>${planInfo.ads ? "No" : "Yes"}</strong></li>
        </ul>
        <p style="color:#6b7280;font-size:13px;margin-top:32px">This is an auto-generated invoice. For support, reply to this email.</p>
      </div>
    </div>
  `;

  await getTransporter().sendMail({
    from: `"YourTube" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: `YourTube ${planInfo.label} Plan — Payment Confirmed`,
    html,
  });
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

// POST /user/subscription/order — create Razorpay order
export const createOrder = async (req, res) => {
  const { plan, userId } = req.body;
  if (!["bronze", "silver", "gold"].includes(plan))
    return res.status(400).json({ message: "Invalid plan" });
  if (!mongoose.Types.ObjectId.isValid(userId))
    return res.status(404).json({ message: "User not found" });

  const planInfo = PLAN_FEATURES[plan];
  try {
    const order = await getRazorpay().orders.create({
      amount: planInfo.price * 100, // paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: { userId, plan },
    });
    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("Razorpay order error:", error);
    return res.status(500).json({ message: "Could not create payment order" });
  }
};

// POST /user/subscription/verify — verify payment & upgrade plan
export const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    plan,
    userId,
  } = req.body;

  // Verify signature
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature)
    return res.status(400).json({ message: "Payment verification failed" });

  if (!["bronze", "silver", "gold"].includes(plan))
    return res.status(400).json({ message: "Invalid plan" });

  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const updatedUser = await users.findByIdAndUpdate(
      userId,
      { $set: { plan, planStartDate: now, planExpiresAt: expiresAt } },
      { new: true }
    );
    if (!updatedUser)
      return res.status(404).json({ message: "User not found" });

    // Send invoice email (non-blocking)
    const planInfo = PLAN_FEATURES[plan];
    sendInvoiceEmail({
      toEmail: updatedUser.email,
      userName: updatedUser.name || "there",
      plan,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      amount: planInfo.price,
    }).catch((err) => console.error("Email send failed:", err));

    return res.status(200).json({
      message: "Payment verified. Plan upgraded!",
      plan: updatedUser.plan,
      planStartDate: updatedUser.planStartDate,
      planExpiresAt: updatedUser.planExpiresAt,
    });
  } catch (error) {
    console.error("Verify payment error:", error);
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

// PATCH /user/plan/:id — downgrade to free only (upgrades go through payment)
export const updatePlan = async (req, res) => {
  const { id } = req.params;
  const { plan } = req.body;
  if (!["free", "bronze", "silver", "gold"].includes(plan))
    return res.status(400).json({ message: "Invalid plan" });
  if (!mongoose.Types.ObjectId.isValid(id))
    return res.status(404).json({ message: "User not found" });
  try {
    const now = new Date();
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
