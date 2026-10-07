// ─── routes/users.js ───────────────────────────────────────────────────────
// User management endpoints — L3 admin access only.
// Ported from: app/actions/users.ts
//
//   GET    /api/users          — List all users (no passwordHash)
//   POST   /api/users          — Create a new user
//   PATCH  /api/users/:id/toggle   — Toggle isActive
//   PATCH  /api/users/:id/password — Reset password
//
// 🔒 BOLA/IDOR PROTECTIONS (OWASP API #1):
//   - validateObjectId() on all :id parameters
//   - preventSelfTarget() blocks admins from disabling/resetting themselves
//   - Target user existence verified before mutation
//   - Role + field allow-listing prevent privilege escalation via body tampering
// ───────────────────────────────────────────────────────────────────────────

'use strict';

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { verifyToken, requireRole } from '../middleware/verifyToken.js';
import { validateObjectId, preventSelfTarget } from '../middleware/objectAuth.js';

const router = Router();

// ⚠️  APPSEC TEST POINT #3 — RBAC on admin endpoints
// All routes here are gated behind verifyToken + requireRole('L3').
// To simulate privilege escalation:
//   - Change requireRole('L3') to requireRole('L1','L2','L3') on any route
//   - Or remove requireRole entirely from a route
router.use(verifyToken, requireRole('L3'));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users
// Returns all users, excluding passwordHash.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (_req, res) => {
  const users = await User.find({}, '-passwordHash').sort({ createdAt: -1 }).lean();

  res.json({
    users: users.map((u) => ({
      ...u,
      _id: u._id.toString(),
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    })),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/users
// Body: { name, username, password, role, extension }
//
// 🔒 BOLA: Only allow-listed fields are read from the body.
//    Prevents clients from injecting _id, isActive, passwordHash, etc.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  // 🔒 Allow-list: only pick known safe fields from the body
  const { name, username, password, role, extension } = req.body;

  if (!name || !username || !password || !role || !extension) {
    return res.status(400).json({ error: 'name, username, password, role, and extension are required' });
  }

  if (!['L1', 'L2', 'L3'].includes(role)) {
    return res.status(400).json({ error: 'role must be L1, L2, or L3' });
  }

  if (password.length < 12) {
    return res.status(400).json({ error: 'Password must be at least 12 characters' });
  }

  const existing = await User.findOne({ username: username.toLowerCase() });
  if (existing) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    name,
    username: username.toLowerCase(),
    passwordHash,
    role,
    extension,
    isActive: true,
  });

  res.status(201).json({
    success: true,
    user: { id: user._id.toString(), name: user.name, username: user.username, role: user.role },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/users/:id/toggle
// Body: { isActive: boolean }
//
// 🔒 BOLA PROTECTIONS:
//   - validateObjectId: rejects malformed IDs
//   - preventSelfTarget: admins cannot disable themselves (would lock them out)
//   - Verifies target user exists before update
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/toggle',
  validateObjectId('id'),
  preventSelfTarget('id'),
  async (req, res) => {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    // 🔒 Verify target user exists before mutation
    const targetUser = await User.findById(req.params.id).lean();
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await User.findByIdAndUpdate(req.params.id, { isActive });
    res.json({ success: true });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/users/:id/password
// Body: { newPassword: string }
//
// 🔒 BOLA PROTECTIONS:
//   - validateObjectId: rejects malformed IDs
//   - preventSelfTarget: admins must use /api/auth/change-password for themselves
//     (which requires the current password — prevents unverified password changes)
//   - Verifies target user exists before update
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/password',
  validateObjectId('id'),
  preventSelfTarget('id'),
  async (req, res) => {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 12) {
      return res.status(400).json({ error: 'newPassword must be at least 12 characters' });
    }

    // 🔒 Verify target user exists before mutation
    const targetUser = await User.findById(req.params.id).lean();
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(req.params.id, { passwordHash });
    res.json({ success: true });
  }
);

export default router;
