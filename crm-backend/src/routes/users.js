// ─── routes/users.js ───────────────────────────────────────────────────────
// User management endpoints — L3 admin access only.
// Ported from: app/actions/users.ts
//
//   GET    /api/users          — List all users (no passwordHash)
//   POST   /api/users          — Create a new user
//   PATCH  /api/users/:id/toggle   — Toggle isActive
//   PATCH  /api/users/:id/password — Reset password
// ───────────────────────────────────────────────────────────────────────────

'use strict';

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { verifyToken, requireRole } from '../middleware/verifyToken.js';

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
      _id:       u._id.toString(),
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    })),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/users
// Body: { name, username, password, role, extension }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { name, username, password, role, extension } = req.body;

  if (!name || !username || !password || !role || !extension) {
    return res.status(400).json({ error: 'name, username, password, role, and extension are required' });
  }

  if (!['L1', 'L2', 'L3'].includes(role)) {
    return res.status(400).json({ error: 'role must be L1, L2, or L3' });
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
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/toggle', async (req, res) => {
  const { isActive } = req.body;
  if (typeof isActive !== 'boolean') {
    return res.status(400).json({ error: 'isActive must be a boolean' });
  }

  await User.findByIdAndUpdate(req.params.id, { isActive });
  res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/users/:id/password
// Body: { newPassword: string }
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/password', async (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'newPassword must be at least 8 characters' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await User.findByIdAndUpdate(req.params.id, { passwordHash });
  res.json({ success: true });
});

export default router;
