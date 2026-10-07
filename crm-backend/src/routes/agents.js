// ─── routes/agents.js ──────────────────────────────────────────────────────
// Agent session, break, and status management endpoints.
// Ported from: app/actions/breaks.ts
//
//   POST  /api/agents/breaks/start      — Start a break
//   POST  /api/agents/breaks/:id/end    — End a break
//   PATCH /api/agents/status            — Update agent status
//   GET   /api/agents/roster            — Today's roster (L3 only)
//   POST  /api/agents/verify-password   — Verify password for unlock screen
//
// 🔒 BOLA/IDOR PROTECTIONS (OWASP API #1):
//   - validateObjectId() on all :id / :agentId parameters
//   - Break end validates break belongs to the requesting agent's session
//   - Force-logout validates target agent exists and is not the requester
//   - All agent-scoped operations use req.user.id from JWT (never from body)
// ───────────────────────────────────────────────────────────────────────────

'use strict';

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import AgentSession from '../models/AgentSession.js';
import User from '../models/User.js';
import { verifyToken, requireRole } from '../middleware/verifyToken.js';
import { validateObjectId, preventSelfTarget } from '../middleware/objectAuth.js';

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
//
// 🔒 BOLA: Agent identity is always taken from req.user.id (JWT).
//    The request body cannot override which agent the break is started for.
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
      // 🔒 BOLA: Check for already-active break to prevent double-breaks
      const hasActiveBreak = agentSession.breaks.some((b) => !b.endTime);
      if (hasActiveBreak) {
        return res.status(400).json({ error: 'You already have an active break. End it first.' });
      }

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
//
// 🔒 BOLA PROTECTIONS:
//   - ObjectId validated
//   - Break must belong to the requesting agent's session (not someone else's)
//   - Break must not already be ended (prevents replay/double-end)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/breaks/:id/end', validateObjectId('id'), async (req, res) => {
  const today = getTodayDate();
  const endTime = new Date();

  // 🔒 BOLA: Only look up the session belonging to the authenticated user
  const agentSession = await AgentSession.findOne({ agentId: req.user.id, shiftDate: today });
  if (!agentSession) return res.status(404).json({ error: 'No active session' });

  const breakEntry = agentSession.breaks.find((b) => b._id?.toString() === req.params.id);
  if (!breakEntry) {
    // 🔒 BOLA: Return generic 404 — don't reveal if break exists in another agent's session
    return res.status(404).json({ error: 'Break not found' });
  }

  // 🔒 Prevent double-ending a break (replay attack)
  if (breakEntry.endTime) {
    return res.status(400).json({ error: 'This break has already been ended' });
  }

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
//
// 🔒 BOLA: Status update is scoped to req.user.id from JWT only.
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
//
// 🔒 BOLA: Uses req.user.id from JWT to look up the user. No user ID in body.
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/agents/monitor/summary
// Returns live KPI counts for the monitoring dashboard. L3 only.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/monitor/summary', requireRole('L3'), async (_req, res) => {
  const today = getTodayDate();
  const sessions = await AgentSession.find({ shiftDate: today })
    .populate('agentId', 'name username role extension')
    .lean();

  const total     = sessions.length;
  const available = sessions.filter((s) => s.currentStatus === 'AVAILABLE').length;
  const onCall    = sessions.filter((s) => s.currentStatus === 'ON_CALL').length;
  const onBreak   = sessions.filter((s) => s.currentStatus === 'ON_BREAK').length;
  const wrapUp    = sessions.filter((s) => s.currentStatus === 'WRAP_UP').length;
  const offline   = sessions.filter((s) => s.currentStatus === 'OFFLINE').length;

  const slaBreached = sessions.filter((s) => {
    const activeBreak = s.breaks.find((b) => !b.endTime);
    if (!activeBreak) return false;
    const cap = BREAK_CAPS[activeBreak.breakType];
    if (!cap) return false;
    return Math.floor((Date.now() - new Date(activeBreak.startTime).getTime()) / 1000) > cap;
  }).length;

  const totalTickets = sessions.reduce((sum, s) => sum + (s.ticketsRegistered || 0), 0);
  const totalTalkSec = sessions.reduce((sum, s) => sum + (s.totalTalkTimeSeconds || 0), 0);

  res.json({ total, available, onCall, onBreak, wrapUp, offline, slaBreached, totalTickets, totalTalkSec });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/agents/monitor/hourly-activity
// Returns hourly agent availability counts (login events by hour). L3 only.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/monitor/hourly-activity', requireRole('L3'), async (_req, res) => {
  const today = getTodayDate();
  const sessions = await AgentSession.find({ shiftDate: today }).lean();

  // Build array of 24 hourly buckets — count agents who had an active session in that hour
  const now = new Date();
  const currentHour = now.getHours();
  const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, count: 0 }));

  for (const session of sessions) {
    const loginHour = new Date(session.createdAt).getHours();
    // Mark all hours from login to current (or end of day) as active
    for (let h = loginHour; h <= currentHour && h < 24; h++) {
      buckets[h].count += 1;
    }
  }

  res.json({ buckets: buckets.slice(0, currentHour + 1) });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/agents/login-log
// Returns agent session login/logout history for today. L3 only.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/login-log', requireRole('L3'), async (_req, res) => {
  const today = getTodayDate();
  const sessions = await AgentSession.find({ shiftDate: today })
    .populate('agentId', 'name username role extension')
    .sort({ createdAt: -1 })
    .lean();

  const log = sessions.map((s) => {
    const agent = s.agentId;
    const loginTime = s.createdAt;
    const isOnline  = s.currentStatus !== 'OFFLINE';
    const logoutTime = isOnline ? null : s.statusChangedAt;
    const durationSec = logoutTime
      ? Math.floor((new Date(logoutTime).getTime() - new Date(loginTime).getTime()) / 1000)
      : Math.floor((Date.now() - new Date(loginTime).getTime()) / 1000);

    return {
      agentId:          agent?._id?.toString(),
      name:             agent?.name,
      username:         agent?.username,
      role:             agent?.role,
      extension:        agent?.extension,
      loginTime:        loginTime instanceof Date ? loginTime.toISOString() : loginTime,
      logoutTime:       logoutTime instanceof Date ? logoutTime.toISOString() : logoutTime,
      isOnline,
      durationSec,
      ticketsRegistered: s.ticketsRegistered,
      currentStatus:    s.currentStatus,
      totalTalkSec:     s.totalTalkTimeSeconds,
      breakCount:       s.breaks.length,
    };
  });

  res.json({ log });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/agents/:agentId/force-logout
// Supervisor force-sets an agent's status to OFFLINE. L3 only.
//
// 🔒 BOLA PROTECTIONS:
//   - validateObjectId: rejects malformed agent IDs
//   - preventSelfTarget: supervisor cannot force-logout themselves
//   - Target agent verified to exist before mutation
// ─────────────────────────────────────────────────────────────────────────────
router.post('/:agentId/force-logout',
  requireRole('L3'),
  validateObjectId('agentId'),
  preventSelfTarget('agentId'),
  async (req, res) => {
    const { agentId } = req.params;
    const today = getTodayDate();

    // 🔒 Verify the target agent exists
    const agent = await User.findById(agentId).lean();
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    // 🔒 Prevent force-logout of other L3 admins (horizontal privilege escalation)
    if (agent.role === 'L3' && agentId !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Cannot force-logout another administrator.',
      });
    }

    const result = await AgentSession.findOneAndUpdate(
      { agentId, shiftDate: today },
      { $set: { currentStatus: 'OFFLINE', statusChangedAt: new Date() } },
      { new: true }
    );

    if (!result) return res.status(404).json({ error: 'No active session for this agent today' });

    res.json({ success: true, agentId, message: `${agent.name} has been force logged out` });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/agents/call-log
// Ticket-based call log with filters. L3 only.
// Query: startDate, endDate, extension, agentId, disposition, callType, phone
// ─────────────────────────────────────────────────────────────────────────────
router.get('/call-log', requireRole('L3'), async (req, res) => {
  const { startDate, endDate, extension, agentUsername, disposition, phone } = req.query;

  // Build Ticket query
  const ticketQuery = {};
  if (startDate || endDate) {
    ticketQuery.createdAt = {};
    if (startDate) ticketQuery.createdAt.$gte = new Date(startDate);
    if (endDate)   ticketQuery.createdAt.$lte = new Date(`${endDate}T23:59:59`);
  }
  if (disposition) ticketQuery.callDisposition = disposition;
  if (phone?.trim()) ticketQuery['victimDetails.contactNumber'] = { $regex: phone.trim(), $options: 'i' };

  // If filtering by agent username / extension, resolve their User._id first
  if (agentUsername?.trim() || extension?.trim()) {
    const userQuery = {};
    if (agentUsername?.trim()) userQuery.username = { $regex: agentUsername.trim(), $options: 'i' };
    if (extension?.trim())     userQuery.extension = extension.trim();
    const users = await User.find(userQuery).select('_id').lean();
    const ids = users.map((u) => u._id);
    if (ids.length === 0) return res.json({ calls: [] });
    ticketQuery.registeredBy = { $in: ids };
  }

  const Ticket = (await import('../models/Ticket.js')).default;
  const tickets = await Ticket.find(ticketQuery)
    .populate('registeredBy', 'name username extension role')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const calls = tickets.map((t) => ({
    id:             t._id?.toString(),
    complaintId:    t.complaintId,
    callDate:       t.createdAt instanceof Date ? t.createdAt.toISOString() : t.createdAt,
    agentName:      t.registeredBy?.name,
    agentUsername:  t.registeredBy?.username,
    extension:      t.registeredBy?.extension,
    role:           t.registeredBy?.role,
    phoneNumber:    t.victimDetails?.contactNumber,
    disposition:    t.callDisposition,
    status:         t.status,
    isGoldenHour:   t.isGoldenHour,
    fraudAmount:    t.totalFraudAmount,
    category:       t.categoryDetails?.category,
    subCategory:    t.categoryDetails?.subCategory,
  }));

  res.json({ calls });
});

export default router;
