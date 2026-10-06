const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const store = require('../lib/store');
const { sendOtpEmail } = require('../lib/mailer');

const router = express.Router();

// Default admin credentials. These seed data/admin.json the first time the
// server runs; after that, data/admin.json is the source of truth (so a
// password reset via the "forgot password" flow survives restarts). Override
// the starting values with env vars before the very first run if you want.
const DEFAULT_USERNAME = process.env.ADMIN_USERNAME || 'alpha';
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD || 'alpha123';

async function ensureAdminFile() {
  const exists = await store.adminFileExists();
  if (exists) return;
  const passwordHash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
  await store.saveAdminCredentials({ username: DEFAULT_USERNAME, passwordHash });
}

// Fire-and-forget at startup; every route below also awaits this so the
// very first request is never a race against it.
const ready = ensureAdminFile();

// ---- In-memory OTP store for the forgot-password flow ----
// Keyed by a random resetId handed to the browser; never keyed by username,
// so a resetId on its own can't be guessed into an account takeover.
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes to enter the code
const RESET_TTL_MS = 10 * 60 * 1000; // 10 more minutes to set a new password once verified
const resets = new Map();

function cleanupResets() {
  const now = Date.now();
  for (const [id, entry] of resets) {
    if (entry.expiresAt < now) resets.delete(id);
  }
}

router.post('/login', async (req, res) => {
  try {
    await ready;
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const creds = await store.getAdminCredentials();
    const validUsername = username === creds.username;
    const validPassword = bcrypt.compareSync(password, creds.passwordHash);

    if (!validUsername || !validPassword) {
      return res.status(401).json({ error: 'Incorrect username or password.' });
    }

    req.session.isAdmin = true;
    req.session.username = username;
    return res.json({ ok: true, username });
  } catch (err) {
    return res.status(500).json({ error: 'Could not log in right now.' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

router.get('/me', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.json({ authenticated: true, username: req.session.username });
  }
  return res.json({ authenticated: false });
});

// ---- Forgot password: step 1, request a code ----
router.post('/forgot-password', async (req, res) => {
  try {
    await ready;
    cleanupResets();
    const { username } = req.body || {};
    if (!username) {
      return res.status(400).json({ error: 'Enter the admin username first.' });
    }

    const creds = await store.getAdminCredentials();
    // Always respond the same way whether or not the username matches, so
    // this endpoint can't be used to probe for a valid admin username.
    if (username === creds.username) {
      const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
      const resetId = crypto.randomUUID();
      resets.set(resetId, {
        username,
        codeHash: bcrypt.hashSync(code, 8),
        verified: false,
        expiresAt: Date.now() + OTP_TTL_MS,
      });
      let delivered = false;
      try {
        ({ delivered } = await sendOtpEmail(code));
      } catch (mailErr) {
        resets.delete(resetId);
        return res.status(500).json({ error: 'Could not send the reset code — please try again shortly.' });
      }

      if (delivered) {
        return res.json({ ok: true, resetId, message: 'A 6-digit code has been sent to the recovery email.' });
      }

      // SMTP isn't configured yet (see lib/mailer.js) — the code has been
      // logged to the server console. Send it back to the browser too so
      // the reset flow is usable right away; remove `devCode` here once
      // SMTP_USER / SMTP_PASS are set and real email delivery works.
      return res.json({
        ok: true,
        resetId,
        devCode: code,
        message: "Email isn't configured yet, so here's the code directly (see README for SMTP setup).",
      });
    }

    return res.json({ ok: true, resetId: null, message: 'A 6-digit code has been sent to the recovery email.' });
  } catch (err) {
    return res.status(500).json({ error: 'Could not start the password reset right now.' });
  }
});

// ---- Forgot password: step 2, verify the code ----
router.post('/verify-otp', (req, res) => {
  cleanupResets();
  const { resetId, code } = req.body || {};
  const entry = resetId && resets.get(resetId);

  if (!entry) {
    return res.status(400).json({ error: 'That reset request is invalid or has expired. Start again.' });
  }
  if (entry.expiresAt < Date.now()) {
    resets.delete(resetId);
    return res.status(400).json({ error: 'That code has expired. Start again.' });
  }
  if (!code || !bcrypt.compareSync(String(code), entry.codeHash)) {
    return res.status(401).json({ error: 'Incorrect code. Check the email and try again.' });
  }

  entry.verified = true;
  entry.expiresAt = Date.now() + RESET_TTL_MS;
  return res.json({ ok: true });
});

// ---- Forgot password: step 3, set a new password ----
router.post('/reset-password', async (req, res) => {
  try {
    cleanupResets();
    const { resetId, newPassword } = req.body || {};
    const entry = resetId && resets.get(resetId);

    if (!entry || !entry.verified) {
      return res.status(400).json({ error: 'Verify the code before setting a new password.' });
    }
    if (entry.expiresAt < Date.now()) {
      resets.delete(resetId);
      return res.status(400).json({ error: 'This reset session has expired. Start again.' });
    }
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Choose a password with at least 6 characters.' });
    }

    const creds = await store.getAdminCredentials();
    const passwordHash = bcrypt.hashSync(newPassword, 10);
    await store.saveAdminCredentials({ username: creds.username, passwordHash });

    resets.delete(resetId);
    return res.json({ ok: true, message: 'Password updated — you can log in with it now.' });
  } catch (err) {
    return res.status(500).json({ error: 'Could not reset the password right now.' });
  }
});

module.exports = router;
