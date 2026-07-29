import nodemailer from "nodemailer";

/**
 * Brevo REST API Email Transport (Primary — HTTPS Port 443 — 300 free emails/day to ANY recipient)
 * Endpoint: POST https://api.brevo.com/v3/smtp/email
 */
export const sendEmailViaBrevo = async ({ toEmail, toName, fromName, subject, html }) => {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY not configured in environment variables");
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || "noreply@yourtube.com";
  const senderName = process.env.BREVO_SENDER_NAME || fromName || "YourTube Platform";

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      "accept": "application/json",
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: toEmail, name: toName || toEmail.split("@")[0] }],
      subject,
      htmlContent: html,
    }),
  });

  const responseText = await res.text().catch(() => "");
  if (!res.ok) {
    console.error(`[BREVO ERROR] HTTP ${res.status} — ${responseText}`);
    let errMsg = `Brevo HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(responseText);
      errMsg = parsed.message || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }

  console.log(`[BREVO SUCCESS] Email sent to ${toEmail}`);
  return true;
};

/**
 * MailerSend REST API Email Transport
 */
export const sendEmailViaMailerSend = async ({ toEmail, toName, subject, html, text }) => {
  const apiKey = process.env.MAILERSEND_API_KEY;
  const senderEmail = process.env.MAILERSEND_SENDER_EMAIL || "MS_trial@mailersend.net";
  const senderName = process.env.MAILERSEND_SENDER_NAME || "YourTube Platform";

  if (!apiKey) {
    throw new Error("MAILERSEND_API_KEY not configured in environment variables");
  }

  const payload = {
    from: {
      email: senderEmail,
      name: senderName,
    },
    to: [
      {
        email: toEmail,
        name: toName || toEmail.split("@")[0] || "User",
      },
    ],
    subject,
    html,
    text: text || subject,
  };

  const res = await fetch("https://api.mailersend.com/v1/email", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify(payload),
  });

  const responseText = await res.text().catch(() => "");
  if (!res.ok) {
    console.error(`[MAILERSEND ERROR] HTTP ${res.status} — ${responseText}`);
    let errMsg = `MailerSend HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(responseText);
      errMsg = parsed.message || errMsg;
    } catch (_) {}
    throw new Error(errMsg);
  }

  console.log(`[MAILERSEND SUCCESS] Email sent to ${toEmail}`);
  return true;
};

/**
 * Fallback email transport (MailerSend -> Resend -> Gmail SMTP)
 */
const sendFallbackEmail = async ({ toEmail, fromName, subject, html, text, toName }) => {
  // Try MailerSend REST API fallback
  if (process.env.MAILERSEND_API_KEY) {
    try {
      await sendEmailViaMailerSend({ toEmail, toName, subject, html, text });
      return;
    } catch (err) {
      console.warn(`[MAILERSEND FALLBACK] MailerSend failed (${err.message}).`);
    }
  }

  // Try Resend REST API fallback (HTTPS Port 443 — Render compatible)
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${fromName} <onboarding@resend.dev>`,
          to: [toEmail],
          subject,
          html,
        }),
      });
      if (res.ok) {
        console.log(`[RESEND FALLBACK SUCCESS] Email sent to ${toEmail}`);
        return;
      }
    } catch (_) {}
  }

  // Try Gmail SMTP fallback
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
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
    console.log(`[GMAIL SMTP FALLBACK SUCCESS] Email sent to ${toEmail}`);
    return;
  }

  console.log(`[EMAIL NOTICE] No working transport configured. Skipping email send to ${toEmail}`);
};

/**
 * Unified Transporter Entrypoint — Priority: Brevo -> MailerSend -> Resend -> Gmail SMTP
 */
export const sendEmail = async ({ toEmail, toName, fromName = "YourTube Platform", subject, html, text }) => {
  // 1. Primary: Brevo REST API (HTTPS Port 443 — 300 free emails/day to ANY recipient)
  if (process.env.BREVO_API_KEY) {
    try {
      await sendEmailViaBrevo({ toEmail, toName, fromName, subject, html });
      return;
    } catch (err) {
      console.warn(`[BREVO FALLBACK] Brevo failed (${err.message}). Trying fallback transport...`);
    }
  }

  await sendFallbackEmail({ toEmail, fromName, subject, html, text, toName });
};

/**
 * Subscription Confirmation Email (Razorpay Invoice)
 */
export const sendSubscriptionConfirmationEmail = async ({
  toEmail,
  userName,
  planLabel,
  amount,
  paymentId,
  orderId,
  purchaseDate = new Date(),
  expiryDate,
}) => {
  const formattedPurchaseDate = new Date(purchaseDate).toDateString();
  const formattedExpiryDate = expiryDate ? new Date(expiryDate).toDateString() : "N/A";

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden">
      <div style="background:#dc2626;padding:24px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:24px">YourTube</h1>
        <p style="color:#fecaca;margin:4px 0 0">Subscription Confirmation</p>
      </div>
      <div style="padding:32px">
        <p style="font-size:16px;color:#111827">Hi <strong>${userName || "Valued Customer"}</strong>,</p>
        <p style="color:#374151">Thank you for subscribing! Your subscription to the <strong>${planLabel} Plan</strong> is now active.</p>
        
        <div style="background:#f9fafb;border-radius:8px;padding:20px;margin:24px 0">
          <h3 style="margin:0 0 16px;color:#111827">Payment & Invoice Summary</h3>
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <tr><td style="padding:6px 0;color:#6b7280">Plan</td><td style="padding:6px 0;font-weight:600;color:#111827">${planLabel}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280">Amount Paid</td><td style="padding:6px 0;font-weight:600;color:#16a34a">&#8377;${amount}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280">Transaction ID</td><td style="padding:6px 0;font-weight:600;color:#374151">${paymentId}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280">Order ID</td><td style="padding:6px 0;font-weight:600;color:#374151">${orderId}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280">Purchase Date</td><td style="padding:6px 0;color:#374151">${formattedPurchaseDate}</td></tr>
            <tr><td style="padding:6px 0;color:#6b7280">Valid Until</td><td style="padding:6px 0;color:#374151">${formattedExpiryDate}</td></tr>
          </table>
        </div>

        <p style="color:#374151;font-size:14px">Thank you for choosing YourTube. We appreciate your support!</p>
        <p style="color:#6b7280;font-size:13px;margin-top:32px">This is an auto-generated invoice receipt. For support, contact us.</p>
      </div>
      <div style="background:#f9fafb;padding:16px;text-align:center;color:#9ca3af;font-size:12px">
        &copy; ${new Date().getFullYear()} YourTube Platform. All rights reserved.
      </div>
    </div>
  `;

  try {
    await sendEmail({
      toEmail,
      toName: userName,
      fromName: "YourTube Subscriptions",
      subject: `YourTube ${planLabel} Plan — Subscription Confirmation`,
      html,
    });
    console.log(`[SUBSCRIPTION INVOICE DISPATCHED] to ${toEmail}`);
  } catch (err) {
    console.error(`[SUBSCRIPTION INVOICE ERROR] ❌ Failed to send confirmation email:`, err.message);
  }
};

/**
 * Security OTP Email
 */
export const sendSecurityOtpEmail = async ({ toEmail, userName, otpCode, device, location }) => {
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
        &copy; ${new Date().getFullYear()} YourTube Platform. All rights reserved.
      </div>
    </div>
  `;

  console.log(`\n==================================================`);
  console.log(`[SECURITY OTP GENERATED] User: ${toEmail} | Code: ${otpCode}`);
  console.log(`==================================================\n`);

  try {
    await sendEmail({
      toEmail,
      toName: userName,
      fromName: "YourTube Security",
      subject: `YourTube Security Verification Code: ${otpCode}`,
      html,
    });
    console.log(`[OTP EMAIL DISPATCHED] to ${toEmail}`);
  } catch (err) {
    console.error(`[OTP EMAIL FAILED] ❌ ${err.message}`);
  }
};
