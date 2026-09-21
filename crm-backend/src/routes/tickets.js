// ─── routes/tickets.js ─────────────────────────────────────────────────────
// Protected ticket endpoints. All routes require verifyToken.
// Business logic ported from: app/actions/tickets.ts
//
//   GET  /api/tickets           — List tickets (role-scoped)
//   POST /api/tickets           — Create a new ticket
//   GET  /api/tickets/my        — L1 agent's own tickets
//   GET  /api/tickets/search    — Search with filters
//   PATCH /api/tickets/:id/disposition — Update call disposition
//   POST /api/tickets/draft     — Save a draft ticket
// ───────────────────────────────────────────────────────────────────────────

'use strict';

import { Router } from 'express';
import Ticket from '../models/Ticket.js';
import AgentSession from '../models/AgentSession.js';
import { verifyToken, requireRole } from '../middleware/verifyToken.js';

const router = Router();

// All ticket routes require a valid JWT
router.use(verifyToken);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateComplaintId() {
  const now = new Date();
  const ts =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, '0') +
    String(now.getDate()).padStart(2, '0') +
    String(now.getHours()).padStart(2, '0') +
    String(now.getMinutes()).padStart(2, '0') +
    String(now.getSeconds()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 90) + 10);
  return `MH${ts}${rand}`;
}

function isGoldenHour(incidentDateTime) {
  if (!incidentDateTime) return false;
  const diffMs = Date.now() - new Date(incidentDateTime).getTime();
  return diffMs / (1000 * 60 * 60) <= 3;
}

/** Strip passwordHash and stringify ObjectIds for safe API responses */
function serializeTicket(t) {
  const obj = t.toObject ? t.toObject() : { ...t };
  return {
    ...obj,
    _id: obj._id?.toString(),
    registeredBy: obj.registeredBy
      ? typeof obj.registeredBy === 'object' && obj.registeredBy._id
        ? { ...obj.registeredBy, _id: obj.registeredBy._id.toString() }
        : obj.registeredBy.toString()
      : obj.registeredBy,
    assignedTo: obj.assignedTo?.toString?.() ?? obj.assignedTo,
    createdAt: obj.createdAt instanceof Date ? obj.createdAt.toISOString() : obj.createdAt,
    updatedAt: obj.updatedAt instanceof Date ? obj.updatedAt.toISOString() : obj.updatedAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tickets
//
// Role-based scoping:
//   L1 → own tickets only (registeredBy = req.user.id)
//   L2, L3 → all tickets, with optional query filters
//
// Query params (L2/L3 only):
//   status, isGoldenHour, fromDate, toDate
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const query = {};

  if (req.user.role === 'L1') {
    // L1 agents can only see their own tickets
    query.registeredBy = req.user.id;
  } else {
    // L2/L3: apply optional filters
    if (req.query.status)       query.status = req.query.status;
    if (req.query.isGoldenHour) query.isGoldenHour = req.query.isGoldenHour === 'true';
    if (req.query.fromDate || req.query.toDate) {
      query.createdAt = {};
      if (req.query.fromDate) query.createdAt.$gte = new Date(req.query.fromDate);
      if (req.query.toDate)   query.createdAt.$lte = new Date(req.query.toDate);
    }
  }

  const tickets = await Ticket.find(query)
    .populate('registeredBy', 'name extension')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  res.json({ tickets: tickets.map(serializeTicket) });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tickets/my
// Convenience alias — always returns the authenticated user's own tickets.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/my', async (req, res) => {
  const tickets = await Ticket.find({ registeredBy: req.user.id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  res.json({ tickets: tickets.map(serializeTicket) });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/tickets/search
// Query params: mobileNumber, nccrpNumber, complaintNumber, district, status, fromDate, toDate
//
// ⚠️  APPSEC TEST POINT #6 — BROKEN OBJECT LEVEL AUTHORIZATION (BOLA/IDOR)
// ─────────────────────────────────────────────────────────────────────────────
// L1 agents are forced into query.registeredBy = req.user.id below.
// To simulate IDOR: remove that constraint and let L1 search all tickets.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/search', async (req, res) => {
  const { mobileNumber, nccrpNumber, complaintNumber, district, status, fromDate, toDate } = req.query;

  // Check at least one filter is provided
  const hasFilter = [mobileNumber, nccrpNumber, complaintNumber, district, status, fromDate, toDate]
    .some((v) => v?.trim?.());

  if (!hasFilter) {
    return res.status(400).json({ error: 'Provide at least one search filter' });
  }

  const query = {};

  // 🔒 BOLA guard: L1 can only search their own tickets
  if (req.user.role === 'L1') {
    query.registeredBy = req.user.id;
  }

  if (mobileNumber?.trim())    query['victimDetails.contactNumber'] = { $regex: mobileNumber.trim(), $options: 'i' };
  if (nccrpNumber?.trim())     query['transactions.nccrpAckNumber'] = { $regex: nccrpNumber.trim(), $options: 'i' };
  if (complaintNumber?.trim()) query.complaintId                    = { $regex: complaintNumber.trim(), $options: 'i' };
  if (district?.trim())        query['victimDetails.district']      = { $regex: district.trim(), $options: 'i' };
  if (status)                  query.status                         = status;
  if (fromDate || toDate) {
    query.createdAt = {};
    if (fromDate) query.createdAt.$gte = new Date(fromDate);
    if (toDate)   query.createdAt.$lte = new Date(`${toDate}T23:59:59`);
  }

  const tickets = await Ticket.find(query)
    .populate('registeredBy', 'name extension')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  res.json({ tickets: tickets.map(serializeTicket) });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tickets
// Body: CreateTicketInput (same shape as the original Server Action)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const input = req.body;

  if (!input.victimDetails || !input.categoryDetails) {
    return res.status(400).json({ error: 'victimDetails and categoryDetails are required' });
  }

  const incidentDateTime = input.incidentDateTime ? new Date(input.incidentDateTime) : undefined;
  const golden = isGoldenHour(incidentDateTime);
  const totalFraudAmount = (input.transactions ?? []).reduce((s, t) => s + (t.transactionAmount || 0), 0);
  const complaintId = generateComplaintId();

  const ticket = await Ticket.create({
    complaintId,
    status: 'L1_REGISTERED',
    isDraft: false,
    victimDetails: input.victimDetails,
    nearestPoliceStation: input.nearestPoliceStation,
    identificationDetails: input.identificationDetails,
    sensitivity: input.sensitivity ?? false,
    priority: input.priority ?? false,
    categoryDetails: input.categoryDetails,
    suspectDetails: input.suspectDetails,
    transactions: (input.transactions ?? []).map((t) => ({
      ...t,
      transactionDateTime: new Date(t.transactionDateTime),
    })),
    totalFraudAmount,
    totalLienAmount: 0,
    recoveryRate: 0,
    isGoldenHour: golden,
    incidentDateTime,
    registeredBy: req.user.id,
  });

  // Increment agent session ticket count
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await AgentSession.findOneAndUpdate(
    { agentId: req.user.id, shiftDate: today },
    { $inc: { ticketsRegistered: 1 } },
    { upsert: true }
  );

  res.status(201).json({
    success: true,
    complaintId,
    isGoldenHour: golden,
    ticketId: ticket._id.toString(),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/tickets/draft
// ─────────────────────────────────────────────────────────────────────────────
router.post('/draft', async (req, res) => {
  const input = req.body;

  const complaintId = generateComplaintId();
  const totalFraudAmount = (input.transactions ?? []).reduce((s, t) => s + (t.transactionAmount || 0), 0);

  await Ticket.create({
    complaintId,
    status: 'DRAFT',
    isDraft: true,
    victimDetails: input.victimDetails,
    nearestPoliceStation: input.nearestPoliceStation,
    identificationDetails: input.identificationDetails,
    sensitivity: input.sensitivity ?? false,
    priority: input.priority ?? false,
    categoryDetails: input.categoryDetails,
    suspectDetails: input.suspectDetails,
    transactions: (input.transactions ?? []).map((t) => ({
      ...t,
      transactionDateTime: new Date(t.transactionDateTime),
    })),
    totalFraudAmount,
    totalLienAmount: 0,
    recoveryRate: 0,
    isGoldenHour: false,
    incidentDateTime: input.incidentDateTime ? new Date(input.incidentDateTime) : undefined,
    registeredBy: req.user.id,
  });

  res.status(201).json({ success: true, complaintId });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/tickets/:id/disposition
// Body: { disposition: string }
//
// ⚠️  APPSEC TEST POINT #3 (continued) — RBAC
// requireRole is not set here — any authenticated user can update disposition.
// To test privilege escalation: remove requireRole from the users router instead.
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/disposition', async (req, res) => {
  const { disposition } = req.body;

  if (!disposition) {
    return res.status(400).json({ error: 'disposition is required' });
  }

  const newStatus = disposition === 'CYBER_FRAUD_COMPLAINT' ? 'L2_PENDING' : 'L1_REGISTERED';

  await Ticket.findByIdAndUpdate(req.params.id, {
    callDisposition: disposition,
    status: newStatus,
  });

  res.json({ success: true });
});

export default router;
