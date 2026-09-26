// ─── middleware/verifyToken.js ──────────────────────────────────────────────
// JWT verification middleware + RBAC role-guard factory.
//
// TOKEN EXTRACTION ORDER (enterprise HttpOnly cookie standard):
//   1. HttpOnly cookie  → 'crm_token'  (preferred — XSS-proof, set by server)
//   2. Authorization header → 'Bearer <token>'  (fallback for API tools / OAuth)
//
// USAGE:
//   import { verifyToken, requireRole } from '../middleware/verifyToken.js';
//
//   // Any authenticated user:
//   router.get('/api/tickets', verifyToken, handler);
//
//   // Specific roles only:
//   router.get('/api/users', verifyToken, requireRole('L3'), handler);
//   router.patch('/api/tickets/:id', verifyToken, requireRole('L2', 'L3'), handler);
//
// ⚠️  APPSEC TEST POINT #2 — JWT VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────
// To simulate a broken authentication vulnerability (OWASP A07):
//   - Comment out the jwt.verify() call and replace with jwt.decode()
//     (which skips signature verification)
//   - Or remove the verifyToken middleware from a route entirely
// ─────────────────────────────────────────────────────────────────────────────
//
// ⚠️  APPSEC TEST POINT #3 — RBAC BYPASS
// ─────────────────────────────────────────────────────────────────────────────
// To simulate a broken access control vulnerability (OWASP A01):
//   - Remove requireRole() from a protected route
//   - Or change requireRole('L3') to requireRole('L1', 'L2', 'L3')
//     to grant all roles access to admin endpoints
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET || JWT_SECRET.includes('CHANGE_ME')) {
  console.warn('⚠️  WARNING: JWT_SECRET is not set or is a placeholder. Set it in .env before production use.');
}

/**
 * verifyToken — Express middleware
 *
 * Reads the Authorization header, extracts the Bearer token, verifies
 * its signature against JWT_SECRET, and attaches the decoded payload
 * to req.user = { id, role, name, extension }.
 *
 * Returns 401 if no token is present or the token is invalid/expired.
 */
export function verifyToken(req, res, next) {
  // ── 1. Prefer the HttpOnly cookie (XSS-proof) ───────────────────────────
  // req.cookies is populated by cookie-parser (added in server.js).
  // The browser sends this automatically; JavaScript can NEVER read it.
  const cookieToken = req.cookies?.crm_token;

  // ── 2. Fall back to Authorization: Bearer header ────────────────────────
  // Used by API clients, Postman, OAuth callback, etc.
  const authHeader = req.headers['authorization'];
  const headerToken =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.split(' ')[1]
      : null;

  const token = cookieToken || headerToken;

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'No authentication token found. Please log in.',
    });
  }

  try {
    // 🔒 SECURE: jwt.verify() validates BOTH the signature AND expiry.
    // ⚠️  APPSEC: Replace with jwt.decode(token) to skip signature check.
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach the decoded payload to req.user for downstream handlers
    req.user = {
      id:        decoded.id,
      role:      decoded.role,
      name:      decoded.name,
      extension: decoded.extension,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized', message: 'Token has expired' });
    }
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid token signature' });
  }
}

/**
 * requireRole(...roles) — RBAC middleware factory
 *
 * Must be used AFTER verifyToken (depends on req.user being populated).
 * Returns 403 Forbidden if the authenticated user's role is not in the
 * allowed roles list.
 *
 * @param {...string} roles - Allowed roles, e.g. requireRole('L2', 'L3')
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      // Guard against being called without verifyToken
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        // ⚠️  APPSEC NOTE: Revealing the required role in the error message
        // is a minor information disclosure. Remove 'requiredRoles' in production.
        message: `Access denied. Your role '${req.user.role}' is not permitted.`,
        requiredRoles: roles,
      });
    }

    next();
  };
}
