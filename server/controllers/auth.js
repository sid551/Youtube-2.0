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

// ── Resend REST API email sender (HTTPS Port 443 — Render Compatible) ──
const sendEmailViaResend = async ({ toEmail, fromName, subject, html }) => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY not configured");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${fromName} <onboarding@resend.dev>`,
      to: [toEmail],
      subject,
      html,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || JSON.stringify(data));
  }
  console.log(`[RESEND API SUCCESS] Email sent to ${toEmail}`);
};

// ── Brevo REST API email sender (HTTPS Port 443 — Render Compatible) ──
const sendEmailViaBrevo = async ({ toEmail, fromName, subject, html }) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("BREVO_API_KEY not configured");

  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || "noreply@yourtube.com";

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: fromName, email: senderEmail },
      to: [{ email: toEmail }],
      subject,
      htmlContent: html,
    }),
  });

  const responseText = await res.text().catch(() => "");
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try { errMsg = JSON.parse(responseText).message || errMsg; } catch (_) {}
    throw new Error(errMsg);
  }
  console.log(`[BREVO API SUCCESS] Email sent to ${toEmail}`);
};

// ── Multi-Transport Email Sender (Resend REST -> Brevo REST -> Gmail SMTP) ──
const sendEmail = async ({ toEmail, fromName, subject, html }) => {
  // 1. Try Resend REST API (HTTPS Port 443 — works on Render free tier)
  if (process.env.RESEND_API_KEY) {
    try {
      await sendEmailViaResend({ toEmail, fromName, subject, html });
      return;
    } catch (err) {
      console.warn(`[RESEND FALLBACK] Resend failed (${err.message}). Trying next transport...`);
    }
  }

  // 2. Try Brevo REST API (HTTPS Port 443 — works on Render free tier)
  if (process.env.BREVO_API_KEY) {
    try {
      await sendEmailViaBrevo({ toEmail, fromName, subject, html });
      return;
    } catch (err) {
      console.warn(`[BREVO FALLBACK] Brevo failed (${err.message}). Trying Gmail SMTP...`);
    }
  }

  // 3. Gmail SMTP (For Localhost Dev)
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: `"${fromName}" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject,
        html,
      });
      console.log(`[GMAIL SMTP SUCCESS] Email sent to ${toEmail}`);
      return;
    } catch (smtpErr) {
      console.error(`[GMAIL SMTP ERROR] ❌ ${smtpErr.message}`);
      throw new Error(`Email sending failed via Gmail SMTP (${smtpErr.message})`);
    }
  }

  console.log(`[EMAIL NOTICE] No working email transport configured for ${toEmail}`);
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

  console.log(`\n==================================================`);
  console.log(`[SECURITY OTP GENERATED] User: ${toEmail} | Code: ${otpCode}`);
  console.log(`==================================================\n`);

  try {
    await sendEmail({
      toEmail,
      fromName: "YourTube Security",
      subject: `YourTube Security Verification Code: ${otpCode}`,
      html,
    });
    console.log(`[OTP EMAIL DISPATCHED] to ${toEmail}`);
  } catch (err) {
    console.error(`[OTP EMAIL FAILED] ❌ ${err.message}`);
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

// Helper to parse Device info (Browser + OS + DeviceId)
const parseDeviceInfo = (req) => {
  const ua = req.headers["user-agent"] || "";
  const bodyDevice = req.body.device || {};
  const deviceId = bodyDevice.deviceId || req.headers["x-device-id"] || "";

  let rawBrowser = (bodyDevice.browser || "").toLowerCase();
  let browser = "Chrome";

  if (
    rawBrowser.includes("edge") ||
    rawBrowser.includes("edg") ||
    ua.includes("Edg")
  ) {
    browser = "Edge";
  } else if (rawBrowser.includes("firefox") || ua.includes("Firefox")) {
    browser = "Firefox";
  } else if (
    rawBrowser.includes("opera") ||
    rawBrowser.includes("opr") ||
    ua.includes("Opera") ||
    ua.includes("OPR")
  ) {
    browser = "Opera";
  } else if (
    rawBrowser.includes("safari") ||
    (ua.includes("Safari") && !ua.includes("Chrome"))
  ) {
    browser = "Safari";
  } else if (rawBrowser.includes("chrome") || ua.includes("Chrome")) {
    browser = "Chrome";
  }

  let rawOs = (bodyDevice.os || "").toLowerCase();
  let os = "Windows";

  if (rawOs.includes("win") || ua.includes("Windows")) {
    os = "Windows";
  } else if (
    rawOs.includes("mac") ||
    ua.includes("Mac OS") ||
    ua.includes("Macintosh")
  ) {
    os = "Mac OS";
  } else if (rawOs.includes("android") || ua.includes("Android")) {
    os = "Android";
  } else if (
    rawOs.includes("ios") ||
    rawOs.includes("iphone") ||
    rawOs.includes("ipad") ||
    ua.includes("iPhone") ||
    ua.includes("iPad")
  ) {
    os = "iOS";
  } else if (rawOs.includes("linux") || ua.includes("Linux")) {
    os = "Linux";
  }

  return {
    deviceId,
    browser,
    os,
    userAgent: ua.slice(0, 150),
  };
};

// Helper to parse Location info (City + State + Country + IP)
const parseLocationInfo = (req) => {
  const bodyLoc = req.body.location || {};

  // Extract real client IP (works behind Render/Nginx proxies)
  const clientIp =
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.headers["x-real-ip"] ||
    req.socket?.remoteAddress ||
    "unknown";

  return {
    city: bodyLoc.city || "Unknown",
    state: bodyLoc.state || "Unknown",
    country: bodyLoc.country || "Unknown",
    ip: bodyLoc.ip || clientIp, // prefer what frontend sent, fallback to server-detected
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
      const initialTrustedDevices = currentDevice.deviceId
        ? [
            {
              deviceId: currentDevice.deviceId,
              browser: currentDevice.browser,
              os: currentDevice.os,
              city: currentLocation.city,
              state: currentLocation.state,
              country: currentLocation.country,
              ip: currentLocation.ip,
              lastLoginAt: new Date(),
            },
          ]
        : [];

      const newUser = await users.create({
        email,
        name: name || "User",
        image: image || "https://github.com/shadcn.png",
        theme: calculatedTheme,
        themePreference: calculatedTheme,
        lastDevice: currentDevice,
        lastLocation: currentLocation,
        trustedDevices: initialTrustedDevices,
      });
      return res.status(201).json({ result: newUser });
    }

    let modified = false;

    // Automatically update theme on every login based on current IST login time
    existingUser.theme = calculatedTheme;
    existingUser.themePreference = calculatedTheme;
    modified = true;

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
    const isChromiumFamily = (b) =>
      ["chrome", "edge", "opera", "brave"].includes((b || "").toLowerCase());

    const isSameBrowserOrChromiumDesktop = (b1, b2) => {
      const browser1 = (b1 || "").toLowerCase();
      const browser2 = (b2 || "").toLowerCase();
      if (browser1 === browser2) return true;
      if (isChromiumFamily(browser1) && isChromiumFamily(browser2)) return true;
      return false;
    };

    const isLocationMatch = (loc1, loc2) => {
      const city1 = (loc1?.city || "").toLowerCase();
      const city2 = (loc2?.city || "").toLowerCase();
      const state1 = (loc1?.state || "").toLowerCase();
      const state2 = (loc2?.state || "").toLowerCase();

      if (city1 && city1 !== "unknown" && city2 !== "unknown") {
        return city1 === city2;
      }
      if (state1 && state1 !== "unknown" && state2 !== "unknown") {
        return state1 === state2;
      }
      const ip1 = loc1?.ip || "";
      const ip2 = loc2?.ip || "";
      if (ip1 && ip2 && ip1 !== "unknown" && ip2 !== "unknown") {
        return ip1 === ip2;
      }
      return true; // fallback to true if no location available
    };

    const trustedList = existingUser.trustedDevices || [];
    const hasDeviceRecord =
      trustedList.length > 0 ||
      (existingUser.lastDevice?.browser && existingUser.lastDevice?.os);
    const isLegacyLocation =
      existingUser.lastLocation?.city === "Mumbai" &&
      !existingUser.lastLocation?.ip;

    if (!hasDeviceRecord || isLegacyLocation) {
      // First time recording security info -> save device & login immediately
      if (currentDevice.deviceId) {
        existingUser.trustedDevices = [
          {
            deviceId: currentDevice.deviceId,
            browser: currentDevice.browser,
            os: currentDevice.os,
            city: currentLocation.city,
            state: currentLocation.state,
            country: currentLocation.country,
            ip: currentLocation.ip,
            lastLoginAt: new Date(),
          },
        ];
      }
      existingUser.lastDevice = currentDevice;
      existingUser.lastLocation = currentLocation;
      await existingUser.save();
      return res.status(200).json({ result: existingUser });
    }

    // Check trustedDevices array first by deviceId or matching browser/os
    let matchingTrustedDeviceIndex = -1;
    if (currentDevice.deviceId) {
      matchingTrustedDeviceIndex = trustedList.findIndex(
        (dev) => dev.deviceId === currentDevice.deviceId
      );
    }

    let isDeviceRecognized = matchingTrustedDeviceIndex >= 0;
    let isLocationFamiliar = false;

    if (isDeviceRecognized) {
      const matchedDev = trustedList[matchingTrustedDeviceIndex];
      isLocationFamiliar = isLocationMatch(matchedDev, currentLocation);
    } else {
      // Fall back to legacy lastDevice check if deviceId matches browser/os
      const legacyDeviceMatches =
        isSameBrowserOrChromiumDesktop(
          existingUser.lastDevice?.browser,
          currentDevice.browser
        ) &&
        (existingUser.lastDevice?.os || "").toLowerCase() ===
          currentDevice.os.toLowerCase();

      if (legacyDeviceMatches) {
        isDeviceRecognized = true;
        isLocationFamiliar = isLocationMatch(
          existingUser.lastLocation,
          currentLocation
        );
      }
    }

    console.log(`[LOGIN DEBUG] User: ${email}`);
    console.log(
      `[LOGIN DEBUG] Current Device: ${currentDevice.browser} / ${currentDevice.os} (ID: ${currentDevice.deviceId})`
    );
    console.log(`[LOGIN DEBUG] Current Location: ${currentLocation.city}, ${currentLocation.state}`);
    console.log(
      `[LOGIN DEBUG] Recognized: ${isDeviceRecognized}, Familiar Location: ${isLocationFamiliar}`
    );

    if (isDeviceRecognized && isLocationFamiliar) {
      // Both match -> Normal Login
      if (matchingTrustedDeviceIndex >= 0) {
        existingUser.trustedDevices[matchingTrustedDeviceIndex].lastLoginAt =
          new Date();
        existingUser.trustedDevices[matchingTrustedDeviceIndex].ip =
          currentLocation.ip;
      } else if (currentDevice.deviceId) {
        existingUser.trustedDevices.push({
          deviceId: currentDevice.deviceId,
          browser: currentDevice.browser,
          os: currentDevice.os,
          city: currentLocation.city,
          state: currentLocation.state,
          country: currentLocation.country,
          ip: currentLocation.ip,
          lastLoginAt: new Date(),
        });
      }
      existingUser.lastDevice = currentDevice;
      existingUser.lastLocation = currentLocation;
      await existingUser.save();
      return res.status(200).json({ result: existingUser });
    }

    // Mismatch detected -> Step-Up Security Trigger (Generate 6-digit OTP)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    existingUser.otp = {
      code: otpCode,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins
    };
    await existingUser.save();

    const targetEmail = existingUser.email || email;
    console.log(`[SECURITY ALERT] OTP generated for ${targetEmail}: ${otpCode}`);

    // Await OTP email using Gmail SMTP to guarantee delivery
    try {
      await sendOtpEmail({
        toEmail: targetEmail,
        userName: existingUser.name,
        otpCode,
        device: currentDevice,
        location: currentLocation,
      });
      console.log(`[REAL OTP EMAIL DISPATCHED] successfully to ${targetEmail}`);
    } catch (emailErr) {
      console.error("[OTP Email dispatch error]:", emailErr);
    }

    return res.status(200).json({
      requiresOtp: true,
      email: targetEmail,
      device: currentDevice,
      location: currentLocation,
      message: `Unusual login detected (${currentDevice.browser} on ${currentDevice.os} from ${currentLocation.city}). A 6-digit verification code has been sent to your email.`,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Something went wrong", error: error.message });
  }
};

// POST /user/verify-otp — confirm verification and mark current device as trusted
export const verifyOtp = async (req, res) => {
  const { email, otp, device, location } = req.body;

  if (!email || otp === undefined || otp === null) {
    return res.status(400).json({ message: "Email and OTP code are required" });
  }

  try {
    const user = await users.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const cleanInputOtp = String(otp).trim();
    const cleanStoredOtp =
      user.otp && user.otp.code ? String(user.otp.code).trim() : null;

    if (
      !cleanStoredOtp ||
      cleanStoredOtp !== cleanInputOtp ||
      !user.otp?.expiresAt ||
      new Date() > new Date(user.otp.expiresAt)
    ) {
      return res.status(400).json({ message: "Invalid or expired OTP code" });
    }

    // OTP is valid! Clear OTP and add/update device in trustedDevices array
    user.otp = { code: null, expiresAt: null };
    if (device) user.lastDevice = device;
    if (location) user.lastLocation = location;

    if (!user.trustedDevices) user.trustedDevices = [];
    const deviceId = device?.deviceId || `dev_${Date.now()}`;
    const devIndex = user.trustedDevices.findIndex((d) => d.deviceId === deviceId);

    const trustedEntry = {
      deviceId,
      browser: device?.browser || "Unknown",
      os: device?.os || "Unknown",
      city: location?.city || "Unknown",
      state: location?.state || "Unknown",
      country: location?.country || "Unknown",
      ip: location?.ip || "",
      lastLoginAt: new Date(),
    };

    if (devIndex >= 0) {
      user.trustedDevices[devIndex] = trustedEntry;
    } else {
      user.trustedDevices.push(trustedEntry);
    }

    await user.save();

    return res.status(200).json({
      result: user,
      message: "Security verification successful!",
    });
  } catch (error) {
    console.error("verifyOtp error:", error);
    return res.status(500).json({ message: "Something went wrong", error: error.message });
  }
};

// POST /user/resend-otp — resend OTP code to the given email
export const resendOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const user = await users.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = {
      code: otpCode,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins
    };
    await user.save();

    console.log(`[RESEND OTP] New OTP generated for ${email}: ${otpCode}`);

    try {
      await sendOtpEmail({
        toEmail: user.email,
        userName: user.name,
        otpCode,
        device: user.lastDevice,
        location: user.lastLocation,
      });
      console.log(`[RESEND OTP DISPATCHED] successfully to ${user.email}`);
    } catch (emailErr) {
      console.error("[Resend OTP email error]:", emailErr);
    }

    return res.status(200).json({ message: "A new 6-digit OTP has been sent to your email." });
  } catch (error) {
    console.error("resendOtp error:", error);
    return res.status(500).json({ message: "Something went wrong", error: error.message });
  }
};


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

  console.log(`[PAYMENT] Verify called — orderId=${razorpay_order_id}, paymentId=${razorpay_payment_id}, plan=${plan}, userId=${userId}`);

  // Verify signature
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    console.error(`[PAYMENT] Signature MISMATCH — expected=${expectedSignature} got=${razorpay_signature}`);
    return res.status(400).json({ message: "Payment verification failed" });
  }
  console.log(`[PAYMENT] Signature verified ✅`);

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
    if (!updatedUser) {
      console.error(`[PAYMENT] User not found for userId=${userId}`);
      return res.status(404).json({ message: "User not found" });
    }
    console.log(`[PAYMENT] Plan updated to '${plan}' for ${updatedUser.email}`);

    // Send invoice email — fire non-blocking and log outcome
    const planInfo = PLAN_FEATURES[plan];
    sendInvoiceEmail({
      toEmail: updatedUser.email,
      userName: updatedUser.name || "there",
      plan,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      amount: planInfo.price,
    }).catch((err) => console.error("[PAYMENT] Invoice email failed:", err.message));

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

