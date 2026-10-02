// ─── routes/auth.js ────────────────────────────────────────────────────────
// Authentication routes:
//
//   POST /api/auth/login       — Manual JWT login (bcrypt password compare)
//   GET  /api/auth/oauth       — OAuth 2.0 init: generate state, redirect to mock provider
//   GET  /api/auth/callback    — OAuth 2.0 callback: validate state, exchange code, issue JWT
//   GET  /api/auth/me          — Return current user info from token
//
// ⚠️  APPSEC TEST POINTS are annotated inline.
// ───────────────────────────────────────────────────────────────────────────

'use strict';

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { verifyToken } from '../middleware/verifyToken.js';

// Strict rate limiter: max 20 login attempts per IP per 15 min
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' },
  skipSuccessfulRequests: true,
});

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';

// ─── In-memory OAuth state store ─────────────────────────────────────────────
// Maps state → { username, expiresAt }
// In production, use Redis with TTL.
//
// ⚠️  APPSEC TEST POINT #4 — OAuth STATE FIXATION (CSRF)
// ─────────────────────────────────────────────────────────────────────────────
// To simulate CSRF on the OAuth callback:
//   - Comment out the stateStore.has(state) check in the callback handler
//   - An attacker can then forge a callback with a known code and bypass the flow
// ─────────────────────────────────────────────────────────────────────────────
const stateStore = new Map();
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Cleanup expired states periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of stateStore) {
    if (val.expiresAt < now) stateStore.delete(key);
  }
}, 60_000);

// ─── Helper: sign a JWT for a User document ───────────────────────────────────
function signTokenForUser(user) {
  const payload = {
    id: user._id.toString(),
    role: user.role,
    name: user.name,
    extension: user.extension,
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// ─── Helper: HttpOnly cookie options ──────────────────────────────────────────
// httpOnly  → JavaScript can NEVER read this cookie (XSS-proof).
// secure    → Only sent over HTTPS. Disabled in local dev (non-HTTPS).
// sameSite  → 'strict' blocks cross-origin form submissions (CSRF defence).
// maxAge    → Matches the JWT expiry (12 h = 43 200 000 ms).
function cookieOpts() {
  return {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   12 * 60 * 60 * 1000, // 12 hours in milliseconds
    path:     '/',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Body: { username: string, password: string }
//
// ⚠️  APPSEC TEST POINT #5 — TIMING ATTACK / USER ENUMERATION
// ─────────────────────────────────────────────────────────────────────────────
// The response deliberately uses a generic "Invalid credentials" message for
// both "user not found" and "wrong password" to prevent user enumeration.
//
// To simulate user enumeration: return distinct messages per case.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = await User.findOne({
    username: username.toLowerCase().trim(),
    isActive: true,
  });

  // Always run bcrypt compare to prevent timing-based user enumeration
  const DUMMY_HASH = '$2b$12$invalidhashpaddingtomatchbcryptlengthXXXXXXXXXXXXXXXXXXX';
  const hashToCompare = user ? user.passwordHash : DUMMY_HASH;
  const isValid = await bcrypt.compare(password, hashToCompare);

  if (!user || !isValid) {
    // Generic message — do not reveal which field was wrong
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signTokenForUser(user);

  // ── Set the JWT in an HttpOnly cookie ────────────────────────────────────────
  // httpOnly: true → document.cookie cannot read this — XSS is defeated.
  // The browser attaches it automatically to every same-origin request.
  res.cookie('crm_token', token, cookieOpts());

  return res.status(200).json({
    token, // kept for backward-compat (e.g. Postman / OAuth callback)
    user: {
      id: user._id.toString(),
      name: user.name,
      username: user.username,
      role: user.role,
      extension: user.extension,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/oauth
//
// OAuth 2.0 Authorization Code Flow — Step 1: Initialization
//
// Generates a cryptographically random 'state' parameter, stores it
// server-side, then redirects the user to the (mock) provider's
// authorization endpoint.
//
// ⚠️  APPSEC TEST POINT #4 (continued)
// The 'state' parameter is what prevents CSRF. If the provider or
// client skips validating state, an attacker can inject a crafted callback.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/oauth', (req, res) => {
  // Generate a random, opaque state token
  const state = crypto.randomBytes(32).toString('hex');

  // Store state with TTL (10 min)
  stateStore.set(state, { expiresAt: Date.now() + STATE_TTL_MS });

  // ── Mock provider URL ────────────────────────────────────────────────────
  // In a real integration, replace this with your provider's authorization URL:
  //   https://github.com/login/oauth/authorize
  //   https://accounts.google.com/o/oauth2/v2/auth
  //
  // The mock provider is hosted at /api/auth/mock-provider (same server).
  const providerUrl = new URL(`http://localhost:${process.env.PORT || 8080}/api/auth/mock-provider`);
  providerUrl.searchParams.set('state', state);
  providerUrl.searchParams.set('redirect_uri', `http://localhost:${process.env.PORT || 8080}/api/auth/callback`);

  return res.redirect(providerUrl.toString());
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/mock-provider
//
// Simulates a minimal OAuth provider authorization page.
// In a real setup this page would show a consent screen.
// Here it immediately issues a mock authorization code and redirects back.
// ─────────────────────────────────────────────────────────────────────────────
// ⚠️  Mock OAuth provider — DEVELOPMENT ONLY
// This route is disabled in production to prevent admin impersonation.
if (process.env.NODE_ENV !== 'production') {
  router.get('/mock-provider', (req, res) => {
    const { state, redirect_uri } = req.query;

    if (!state || !redirect_uri) {
      return res.status(400).send('Bad request: missing state or redirect_uri');
    }

    // Issue a mock authorization code tied to the default admin account
    const mockCode = Buffer.from(JSON.stringify({ username: 'admin', ts: Date.now() })).toString('base64');

    const callbackUrl = new URL(redirect_uri);
    callbackUrl.searchParams.set('code', mockCode);
    callbackUrl.searchParams.set('state', state);

    return res.send(`
      <!DOCTYPE html>
      <html>
        <head><title>Mock OAuth Provider</title></head>
        <body style="font-family:sans-serif;text-align:center;padding:2rem">
          <h2>🔐 Mock OAuth Provider</h2>
          <p>Simulating user authorization grant...</p>
          <p>Redirecting to callback in 2 seconds.</p>
          <script>setTimeout(() => { window.location.href = '${callbackUrl.toString()}' }, 2000)</script>
        </body>
      </html>
    `);
  });
} else {
  // In production return 404 so the route is invisible to scanners
  router.get('/mock-provider', (_req, res) => res.status(404).json({ error: 'Not found' }));
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/callback
// Query: { code: string, state: string }
//
// OAuth 2.0 Authorization Code Flow — Step 2: Token Exchange
//
// Validates the state parameter (CSRF check), decodes the authorization
// code, looks up the user, and issues a JWT.
//
// ⚠️  APPSEC TEST POINT #4 (continued)
// To simulate state fixation: comment out lines marked "CSRF CHECK"
// ─────────────────────────────────────────────────────────────────────────────
router.get('/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state parameter' });
  }

  // ── CSRF CHECK — ⚠️ APPSEC: Comment these 4 lines to disable state validation ──
  if (!stateStore.has(state)) {
    return res.status(400).json({ error: 'Invalid or expired OAuth state (possible CSRF)' });
  }
  stateStore.delete(state); // One-time use — delete after validation
  // ── END CSRF CHECK ────────────────────────────────────────────────────────

  // Decode the mock authorization code
  let username;
  try {
    const decoded = JSON.parse(Buffer.from(code, 'base64').toString('utf-8'));
    username = decoded.username;
  } catch {
    return res.status(400).json({ error: 'Invalid authorization code' });
  }

  const user = await User.findOne({ username: username.toLowerCase(), isActive: true });
  if (!user) {
    return res.status(401).json({ error: 'OAuth user not found or inactive' });
  }

  const token = signTokenForUser(user);

  // Set the HttpOnly cookie for browser-based auth (same as login flow)
  res.cookie('crm_token', token, cookieOpts());

  // Return token as JSON (frontend can also redirect to the SPA with token in fragment)
  return res.status(200).json({
    token,
    user: {
      id: user._id.toString(),
      name: user.name,
      username: user.username,
      role: user.role,
      extension: user.extension,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// Clears the HttpOnly auth cookie server-side.
// No body required — the cookie is identified by name, not by value.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/logout', (_req, res) => {
  res.clearCookie('crm_token', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path:     '/',
  });
  return res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/change-password
// Body: { currentPassword: string, newPassword: string }
// Requires: Bearer token (user identity taken from JWT, never from request body)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/change-password', verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  }
  if (newPassword.length < 12) {
    return res.status(400).json({ error: 'New password must be at least 12 characters' });
  }

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) return res.status(400).json({ error: 'Current password is incorrect' });

  user.passwordHash = await bcrypt.hash(newPassword, 12);
  await user.save();

  res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// Returns the currently authenticated user's info (decoded from JWT).
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

export default router;
