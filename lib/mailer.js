const nodemailer = require('nodemailer');

// The address that receives password-reset codes for the admin panel.
// Override with RECOVERY_EMAIL if you ever need to send it elsewhere.
const RECOVERY_EMAIL = process.env.RECOVERY_EMAIL || 'kaudeore2000@gmail.com';

let transporter = null;
let warned = false;

/**
 * Builds (and caches) a nodemailer transporter from SMTP env vars.
 *
 * To actually send mail, set these before starting the server:
 *   SMTP_USER=youraddress@gmail.com
 *   SMTP_PASS=your-16-character-gmail-app-password   (NOT your normal password)
 * A Gmail App Password requires 2-Step Verification to be turned on for
 * that Google account: myaccount.google.com/apppasswords
 *
 * Optional overrides:
 *   SMTP_HOST (default smtp.gmail.com)
 *   SMTP_PORT (default 465)
 */
function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

/**
 * Sends the 6-digit OTP to the recovery inbox. If SMTP credentials
 * haven't been configured yet (local development), it logs the code to
 * the console instead of throwing, so the reset flow still works while
 * you set up real email sending.
 */
async function sendOtpEmail(code) {
  const t = getTransporter();

  if (!t) {
    if (!warned) {
      warned = true;
      console.warn(
        '[mailer] SMTP_USER / SMTP_PASS are not set — printing the admin reset code to the console instead of emailing it. See lib/mailer.js for setup.'
      );
    }
    console.log(`[mailer] Admin password reset code for ${RECOVERY_EMAIL}: ${code}`);
    return { delivered: false };
  }

  await t.sendMail({
    from: `"Alpha Furnishings Admin" <${process.env.SMTP_USER}>`,
    to: RECOVERY_EMAIL,
    subject: 'Your Alpha Furnishings admin password reset code',
    text: `Your verification code is ${code}. It expires in 10 minutes. If you didn't request this, you can ignore this email.`,
    html: `<p>Your verification code is:</p><p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p><p>It expires in 10 minutes. If you didn't request this, you can ignore this email.</p>`,
  });

  return { delivered: true };
}

module.exports = { sendOtpEmail, RECOVERY_EMAIL };
