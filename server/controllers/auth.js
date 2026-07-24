import mongoose from "mongoose";
import Razorpay from "razorpay";
import crypto from "crypto";
import nodemailer from "nodemailer";
import users from "../Modals/Auth.js";
import video from "../Modals/video.js";

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

const sendOtpEmail = async ({ toEmail, userName, otpCode, device, location }) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <div style="background:#dc2626;padding:24px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:24px">YourTube</h1>
        <p style="color:#fecaca;margin:4px 0 0">Security Verification Code</p>
      </div>
      <div style="padding:32px">
        <p style="font-size:16px;color:#111827">Hi <strong>${userName || "User"}</strong>,</p>
        <p style="color:#374151">We detected a login attempt from a new location or device:</p>
        <ul style="color:#374151;line-height:1.6">
          <li><strong>Device:</strong> ${device?.browser || "Unknown"} on ${device?.os || "Unknown"}</li>
          <li><strong>Location:</strong> ${location?.city || "Unknown"}, ${location?.country || "Unknown"}</li>
        </ul>
        <p style="color:#374151">Use the following 6-digit verification code to complete your login:</p>
        <div style="background:#f3f4f6;padding:16px;text-align:center;border-radius:8px;margin:20px 0;letter-spacing:6px;font-size:32px;font-weight:bold;color:#dc2626">
          ${otpCode}
        </div>
        <p style="color:#6b7280;font-size:14px">This code is valid for 10 minutes. If you did not initiate this login attempt, please secure your account immediately.</p>
      </div>
      <div style="background:#f9fafb;padding:16px;text-align:center;color:#9ca3af;font-size:12px">
        &copy; ${new Date().getFullYear()} YourTube. All rights reserved.
      </div>
    </div>
  `;

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from: `"YourTube Security" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: `YourTube Security Verification Code: ${otpCode}`,
      html,
    });
    console.log(`[OTP SENT] Successfully sent OTP to ${toEmail}`);
  } catch (err) {
    console.error(`[OTP EMAIL ERROR] Failed to send OTP to ${toEmail}:`, err.message);
  }
};

// Helper to calculate time-based theme in Indian Standard Time (IST, UTC+5:30)
// If login time is between 10:00 AM and 12:00 PM IST (inclusive), theme is "light", otherwise "dark".
export const calculateIstTimeBasedTheme = () => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
  const minute = parseInt(
    parts.find((p) => p.type === "minute")?.value || "0",
    10
  );
  const totalMinutes = hour * 60 + minute;

  // 10:00 AM IST = 600 minutes, 12:00 PM IST = 720 minutes
  const isLightTime = totalMinutes >= 600 && totalMinutes <= 720;
  return isLightTime ? "light" : "dark";
};

// Helper to parse Device info (Browser + OS)
const parseDeviceInfo = (req) => {
  const ua = req.headers["user-agent"] || "";
  const bodyDevice = req.body.device || {};

  let browser = bodyDevice.browser || "Chrome";
  let os = bodyDevice.os || "Windows";

  if (!bodyDevice.browser) {
    if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Edg")) browser = "Edge";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
    else if (ua.includes("Chrome")) browser = "Chrome";
  }

  if (!bodyDevice.os) {
    if (ua.includes("Windows")) os = "Windows";
    else if (ua.includes("Mac OS") || ua.includes("Macintosh")) os = "Mac OS";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
    else if (ua.includes("Linux")) os = "Linux";
  }

  return {
    browser,
    os,
    userAgent: ua.slice(0, 150),
  };
};

// Helper to parse Location info (City + State + Country)
const parseLocationInfo = (req) => {
  const bodyLoc = req.body.location || {};
  return {
    city: bodyLoc.city || "Mumbai",
    state: bodyLoc.state || "Maharashtra",
    country: bodyLoc.country || "India",
  };
};

export const login = async (req, res) => {
  const { email, name, image } = req.body;
  if (!email) {
    return res.status(400).json({ message: "Email is required for login" });
  }

  try {
    const calculatedTheme = calculateIstTimeBasedTheme();
    const currentDevice = parseDeviceInfo(req);
    const currentLocation = parseLocationInfo(req);

    const existingUser = await users.findOne({ email });
    if (!existingUser) {
      const newUser = await users.create({
        email,
        name: name || "User",
        image: image || "https://github.com/shadcn.png",
        theme: calculatedTheme,
        themePreference: calculatedTheme,
        lastDevice: currentDevice,
        lastLocation: currentLocation,
      });
      return res.status(201).json({ result: newUser });
    }

    let modified = false;

    // Check saved themePreference or theme
    const activeThemePref = existingUser.themePreference || existingUser.theme;
    if (!activeThemePref) {
      existingUser.theme = calculatedTheme;
      existingUser.themePreference = calculatedTheme;
      modified = true;
    } else {
      if (!existingUser.themePreference) {
        existingUser.themePreference = activeThemePref;
        modified = true;
      }
      if (!existingUser.theme) {
        existingUser.theme = activeThemePref;
        modified = true;
      }
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
      modified = true;
    }

    // Security Verification: Device & Location Check
    const hasDeviceRecord =
      existingUser.lastDevice?.browser && existingUser.lastDevice?.os;
    const hasLocationRecord = existingUser.lastLocation?.city;

    if (!hasDeviceRecord || !hasLocationRecord) {
      // First time recording security info -> save & login immediately
      existingUser.lastDevice = currentDevice;
      existingUser.lastLocation = currentLocation;
      await existingUser.save();
      return res.status(200).json({ result: existingUser });
    }

    // Compare current vs last recorded device and location
    const deviceMatches =
      existingUser.lastDevice.browser.toLowerCase() ===
        currentDevice.browser.toLowerCase() &&
      existingUser.lastDevice.os.toLowerCase() ===
        currentDevice.os.toLowerCase();

    const locationMatches =
      existingUser.lastLocation.city.toLowerCase() ===
      currentLocation.city.toLowerCase();

    if (deviceMatches && locationMatches) {
      // Both match -> Normal Login
      if (modified) await existingUser.save();
      return res.status(200).json({ result: existingUser });
    }

    // Mismatch detected -> Unusual Login Security Trigger (Generate 6-digit OTP)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    existingUser.otp = {
      code: otpCode,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins
    };
    await existingUser.save();

    console.log(`[SECURITY ALERT] OTP generated for ${email}: ${otpCode}`);

    // Send OTP email to user's Gmail address (non-fatal if SMTP fails)
    try {
      await sendOtpEmail({
        toEmail: existingUser.email,
        userName: existingUser.name,
        otpCode,
        device: currentDevice,
        location: currentLocation,
      });
    } catch (emailErr) {
      console.error("[OTP Email non-fatal error]:", emailErr);
    }

    return res.status(200).json({
      requiresOtp: true,
      email: existingUser.email,
      device: currentDevice,
      location: currentLocation,
      message: `Unusual login detected (${currentDevice.browser} on ${currentDevice.os} from ${currentLocation.city}). A 6-digit OTP code has been sent to your email.`,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong", error: error.message });
  }
};

// POST /user/verify-otp — verify OTP and complete login
export const verifyOtp = async (req, res) => {
  const { email, otp, device, location } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP code are required" });
  }

  try {
    const user = await users.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (
      !user.otp ||
      !user.otp.code ||
      user.otp.code !== otp.trim() ||
      !user.otp.expiresAt ||
      new Date() > new Date(user.otp.expiresAt)
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP code" });
    }

    // OTP is valid! Clear OTP and update stored device & location info
    user.otp = { code: null, expiresAt: null };
    if (device) user.lastDevice = device;
    if (location) user.lastLocation = location;
    await user.save();

    return res.status(200).json({
      result: user,
      message: "Security verification successful!",
    });
  } catch (error) {
    console.error("verifyOtp error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// PATCH /user/theme/:id — explicit theme update or recalculation reset
export const updateTheme = async (req, res) => {
  const { id } = req.params;
  const { theme, themePreference, reset } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(404).json({ message: "User not found" });
  }

  try {
    let targetTheme = themePreference || theme;
    if (reset || !targetTheme) {
      targetTheme = calculateIstTimeBasedTheme();
    } else if (!["light", "dark"].includes(targetTheme)) {
      return res.status(400).json({ message: "Invalid theme preference" });
    }

    const updatedUser = await users.findByIdAndUpdate(
      id,
      { $set: { theme: targetTheme, themePreference: targetTheme } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      theme: updatedUser.theme,
      themePreference: updatedUser.themePreference,
      message: "Theme preference saved successfully",
    });
  } catch (error) {
    console.error("updateTheme error:", error);
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

// Helper to find channel user by ObjectId or channelname/name
const findChannelUser = async (identifier) => {
  if (!identifier || identifier === "undefined") return null;
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    const userById = await users.findById(identifier);
    if (userById) return userById;
  }
  return await users.findOne({
    $or: [{ channelname: identifier }, { name: identifier }],
  });
};

export const getUser = async (req, res) => {
  const { id } = req.params;
  try {
    const user = await findChannelUser(id);
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

// POST /user/subscribe/:channelId — toggle subscribe/unsubscribe
export const toggleSubscribe = async (req, res) => {
  const { channelId } = req.params;
  const { userId } = req.body;

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user id" });
  }

  try {
    const channel = await findChannelUser(channelId);
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    const targetId = channel._id.toString();

    if (targetId === userId.toString()) {
      return res.status(400).json({ message: "Cannot subscribe to yourself" });
    }

    const alreadySubscribed = (channel.subscribers || []).some(
      (id) => id.toString() === userId.toString()
    );

    if (alreadySubscribed) {
      // Remove subscriber from target channel
      await users.findByIdAndUpdate(targetId, {
        $pull: { subscribers: userId },
      });
      // Remove target channel from subscriber's document
      await users.findByIdAndUpdate(userId, {
        $pull: { subscribedChannels: targetId },
      });
    } else {
      // Add subscriber to target channel
      await users.findByIdAndUpdate(targetId, {
        $addToSet: { subscribers: userId },
      });
      // Add target channel to subscriber's document
      await users.findByIdAndUpdate(userId, {
        $addToSet: { subscribedChannels: targetId },
      });
    }

    const updated = await users.findById(targetId).select("subscribers");
    return res.status(200).json({
      subscribed: !alreadySubscribed,
      subscriberCount: updated.subscribers ? updated.subscribers.length : 0,
      channelId: targetId,
    });
  } catch (error) {
    console.error("Subscribe error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// GET /user/subscribe/status/:channelId?userId=xxx
export const getSubscribeStatus = async (req, res) => {
  const { channelId } = req.params;
  const { userId } = req.query;

  try {
    const channel = await findChannelUser(channelId);
    if (!channel) {
      return res.status(200).json({
        subscribed: false,
        subscriberCount: 0,
        channelId: channelId,
      });
    }

    const subscribers = channel.subscribers || [];
    const subscribed = userId
      ? subscribers.some((id) => id.toString() === userId.toString())
      : false;

    return res.status(200).json({
      subscribed,
      subscriberCount: subscribers.length,
      channelId: channel._id.toString(),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

// GET /user/subscriptions/:userId — get channels user is subscribed to and their videos
export const getUserSubscriptions = async (req, res) => {
  const { userId } = req.params;
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ message: "Invalid user id" });
  }
  try {
    const subscribedChannels = await users
      .find({ subscribers: userId })
      .select("_id name channelname image description subscribers");

    const channelIds = subscribedChannels.map((ch) => ch._id.toString());

    const channelVideos = await video
      .find({ uploader: { $in: channelIds } })
      .sort({ createdAt: -1 });

    return res.status(200).json({
      channels: subscribedChannels,
      videos: channelVideos,
    });
  } catch (error) {
    console.error("getUserSubscriptions error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

