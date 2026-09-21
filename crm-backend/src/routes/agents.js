// ─── routes/agents.js ──────────────────────────────────────────────────────
// Agent session, break, and status management endpoints.
// Ported from: app/actions/breaks.ts
//
//   POST  /api/agents/breaks/start      — Start a break
//   POST  /api/agents/breaks/:id/end    — End a break
//   PATCH /api/agents/status            — Update agent status
//   GET   /api/agents/roster            — Today's roster (L3 only)
//   POST  /api/agents/verify-password   — Verify password for unlock screen
// ───────────────────────────────────────────────────────────────────────────

'use strict';

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import AgentSession from '../models/AgentSession.js';
import User from '../models/User.js';
import { verifyToken, requireRole } from '../middleware/verifyToken.js';

const router = Router();
router.use(verifyToken);

// Break caps in seconds (null = uncapped). Mirrors the frontend breakStore constants.
const BREAK_CAPS = {
  LUNCH: 30 * 60,        // 30 min
  TEA: 10 * 60,          // 10 min
  BIO: 5 * 60,           // 5 min
  TRAINING: null,        // uncapped
  FEEDBACK_QUERY: null,  // uncapped
};

function getTodayDate() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/agents/breaks/start
// Body: { breakType: 'LUNCH' | 'TEA' | 'BIO' | 'TRAINING' | 'FEEDBACK_QUERY' }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/breaks/start', async (req, res) => {
  const { breakType } = req.body;
  const validTypes = ['LUNCH', 'TEA', 'BIO', 'TRAINING', 'FEEDBACK_QUERY'];

  if (!validTypes.includes(breakType)) {
    return res.status(400).json({ error: 'Invalid breakType' });
  }

  const today = getTodayDate();
  const cap = BREAK_CAPS[breakType];
  const isCapped = cap !== null;

  // Enforce daily capped break limit (60 min total)
  if (isCapped) {
    const agentSession = await AgentSession.findOne({
      agentId: req.user.id,
      shiftDate: today,
    }).lean();

    if (agentSession) {
      const usedCappedSeconds = agentSession.breaks
        .filter((b) => b.isCapped && b.durationSeconds)
        .reduce((sum, b) => sum + (b.durationSeconds || 0), 0);

      if (usedCappedSeconds >= 60 * 60) {
        return res.status(400).json({ error: 'Daily capped break limit of 60 minutes reached', success: false });
      }
    }
  }

  const result = await AgentSession.findOneAndUpdate(
    { agentId: req.user.id, shiftDate: today },
    {
      $push: { breaks: { breakType, isCapped, startTime: new Date() } },
      $set: { currentStatus: 'ON_BREAK', statusChangedAt: new Date() },
    },
    { upsert: true, new: true }
  );

  const addedBreak = result.breaks[result.breaks.length - 1];
  res.json({ success: true, breakId: addedBreak._id?.toString() });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/agents/breaks/:id/end
// ─────────────────────────────────────────────────────────────────────────────
router.post('/breaks/:id/end', async (req, res) => {
  const today = getTodayDate();
  const endTime = new Date();

  const agentSession = await AgentSession.findOne({ agentId: req.user.id, shiftDate: today });
  if (!agentSession) return res.status(404).json({ error: 'No active session' });

  const breakEntry = agentSession.breaks.find((b) => b._id?.toString() === req.params.id);
  if (!breakEntry) return res.status(404).json({ error: 'Break not found' });

  const durationSeconds = Math.floor((endTime.getTime() - breakEntry.startTime.getTime()) / 1000);

  await AgentSession.findOneAndUpdate(
    { agentId: req.user.id, shiftDate: today, 'breaks._id': breakEntry._id },
    {
      $set: {
        'breaks.$.endTime': endTime,
        'breaks.$.durationSeconds': durationSeconds,
        currentStatus: 'AVAILABLE',
        statusChangedAt: new Date(),
      },
    }
  );

  res.json({ success: true, durationSeconds });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/agents/status
// Body: { status: 'AVAILABLE' | 'ON_CALL' | 'WRAP_UP' | 'OFFLINE' }
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/status', async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['AVAILABLE', 'ON_CALL', 'WRAP_UP', 'OFFLINE'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const today = getTodayDate();
  await AgentSession.findOneAndUpdate(
    { agentId: req.user.id, shiftDate: today },
    { $set: { currentStatus: status, statusChangedAt: new Date() } },
    { upsert: true }
  );

  res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/agents/verify-password
// Body: { password: string }
// Used by the lock screen — validates password without issuing a new token.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify-password', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'password is required' });

  const user = await User.findById(req.user.id).lean();
  if (!user) return res.status(404).json({ error: 'User not found' });

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) return res.status(400).json({ error: 'Incorrect password' });

  res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/agents/roster
// Returns today's agent roster. L3 only.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/roster', requireRole('L3'), async (_req, res) => {
  const today = getTodayDate();
  const sessions = await AgentSession.find({ shiftDate: today })
    .populate('agentId', 'name username role extension')
    .lean();

  const roster = sessions.map((s) => {
    const agent = s.agentId;
    const cappedBreakSeconds = s.breaks
      .filter((b) => b.isCapped && b.durationSeconds)
      .reduce((sum, b) => sum + (b.durationSeconds || 0), 0);

    const activeBreak = s.breaks.find((b) => !b.endTime);
    const isSLABreached = activeBreak
      ? (() => {
          const cap = BREAK_CAPS[activeBreak.breakType];
          if (!cap) return false;
          return Math.floor((Date.now() - new Date(activeBreak.startTime).getTime()) / 1000) > cap;
        })()
      : false;

    return {
      agentId:              agent?._id?.toString(),
      name:                 agent?.name,
      username:             agent?.username,
      role:                 agent?.role,
      extension:            agent?.extension,
      currentStatus:        s.currentStatus,
      statusChangedAt:      s.statusChangedAt.toISOString(),
      totalTalkTimeSeconds: s.totalTalkTimeSeconds,
      totalWrapUpTimeSeconds: s.totalWrapUpTimeSeconds,
      ticketsRegistered:    s.ticketsRegistered,
      cappedBreakSeconds,
      isSLABreached,
      activeBreakType:      activeBreak?.breakType,
    };
  });

  res.json({ roster });
});

export default router;
