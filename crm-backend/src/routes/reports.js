// ─── routes/reports.js ─────────────────────────────────────────────────────
// Reporting endpoints — L2/L3 only.
//
//   GET /api/reports/data       — Aggregated KPI data (date-range aware)
//   GET /api/reports/export-csv — Ticket CSV export (date-range aware)
//
// 🔒 BOLA/IDOR PROTECTIONS (OWASP API #1):
//   - agentId filter validated as a valid ObjectId before use in DB query
//   - Prevents crafted agentId values from probing DB for valid user IDs
//   - L2 role restricted from filtering by arbitrary agentId (can only see own)
//   - Date inputs sanitized to prevent query injection via malformed dates
// ───────────────────────────────────────────────────────────────────────────

'use strict';

import { Router } from 'express';
import mongoose from 'mongoose';
import Ticket from '../models/Ticket.js';
import AgentSession from '../models/AgentSession.js';
import { verifyToken, requireRole } from '../middleware/verifyToken.js';

const router = Router();
router.use(verifyToken, requireRole('L2', 'L3'));

function escapeCsv(value) {
  if (value === undefined || value === null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/**
 * Safely parse a date string. Returns null if the string is invalid.
 * Prevents malformed date strings from reaching Mongoose queries.
 */
function safeDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/data
// Returns aggregated report KPIs for the reports dashboard.
//
// Query params:
//   from     — ISO date string (default: today 00:00)
//   to       — ISO date string (default: now)
//   agentId  — Mongoose ObjectId (optional, filters to one agent)
//
// 🔒 BOLA PROTECTIONS:
//   - agentId validated as a real ObjectId before use in DB queries
//   - L2 users can only filter by their own agentId (not arbitrary users)
//   - Invalid dates are rejected rather than silently falling through
// ─────────────────────────────────────────────────────────────────────────────
router.get('/data', async (req, res) => {
  const { from, to, agentId } = req.query;

  // Default date range = today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fromDate = safeDate(from) ?? today;
  const toDate   = from ? (safeDate(`${to}T23:59:59`) ?? new Date()) : new Date();

  // 🔒 BOLA: Validate agentId is a proper ObjectId before using in a DB query
  let resolvedAgentId = null;
  if (agentId) {
    if (!mongoose.Types.ObjectId.isValid(agentId)) {
      return res.status(400).json({ error: 'Invalid agentId format' });
    }

    // 🔒 BOLA: L2 officers can only query their own data, not arbitrary agents
    if (req.user.role === 'L2' && agentId !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'L2 users may only filter reports by their own agent ID.',
      });
    }

    resolvedAgentId = agentId;
  }

  // Base match applied to the selected period
  const periodMatch = { createdAt: { $gte: fromDate, $lte: toDate } };
  if (resolvedAgentId) periodMatch.registeredBy = resolvedAgentId;

  // 7-day window is always relative to now (for week comparison widget)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalTicketsPeriod,
    totalTicketsWeek,
    goldenHourCases,
    fraudAggregate,
    agentSessions,
    statusBreakdown,
    categoryBreakdown,
  ] = await Promise.all([
    Ticket.countDocuments(periodMatch),
    Ticket.countDocuments({ createdAt: { $gte: weekAgo } }),
    Ticket.countDocuments({ isGoldenHour: true, ...periodMatch }),
    Ticket.aggregate([
      { $match: periodMatch },
      { $group: { _id: null, total: { $sum: '$totalFraudAmount' }, lien: { $sum: '$totalLienAmount' } } },
    ]),
    AgentSession.find({ shiftDate: today }).populate('agentId', 'name role extension username').lean(),
    Ticket.aggregate([
      { $match: periodMatch },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Ticket.aggregate([
      { $match: periodMatch },
      { $group: { _id: '$categoryDetails.category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  const fraudStats = fraudAggregate[0] ?? { total: 0, lien: 0 };
  const overallRecovery = fraudStats.total > 0
    ? ((fraudStats.lien / fraudStats.total) * 100).toFixed(1)
    : '0';

  res.json({
    data: {
      // Legacy field names (kept for backward-compat)
      totalTicketsToday:  totalTicketsPeriod,
      totalFraudToday:    fraudStats.total,
      totalLienToday:     fraudStats.lien,
      // New period-aware fields
      totalTicketsPeriod,
      totalTicketsWeek,
      goldenHourCases,
      totalFraudPeriod:   fraudStats.total,
      totalLienPeriod:    fraudStats.lien,
      overallRecovery,
      agentSessions: agentSessions.map((s) => ({
        ...s,
        _id:       s._id.toString(),
        agentId:   s.agentId,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      statusBreakdown,
      categoryBreakdown,
      dateRange: { from: fromDate.toISOString(), to: toDate.toISOString() },
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/export-csv
// Exports tickets as a CSV file.
//
// Query params:
//   from — ISO date string (default: today 00:00)
//   to   — ISO date string (default: now)
//
// 🔒 BOLA PROTECTIONS:
//   - L2 users can only export their own tickets (not all agents' data)
//   - Date inputs validated before use
//   - CSV injection prevented via escapeCsv() on all fields
// ─────────────────────────────────────────────────────────────────────────────
router.get('/export-csv', async (req, res) => {
  const { from, to } = req.query;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fromDate = safeDate(from) ?? today;
  const toDate   = safeDate(`${to}T23:59:59`) ?? new Date();

  // 🔒 BOLA: L2 officers can only export their own tickets
  const ticketQuery = { createdAt: { $gte: fromDate, $lte: toDate } };
  if (req.user.role === 'L2') {
    ticketQuery.registeredBy = req.user.id;
  }

  const tickets = await Ticket.find(ticketQuery)
    .populate('registeredBy', 'name extension')
    .sort({ createdAt: -1 })
    .lean();

  const headers = [
    'Complaint ID', 'Status', 'Call Disposition', 'Victim Name',
    'Contact Number', 'Alternate Contact', 'Email', 'District', 'State', 'Address',
    'Category', 'Sub Category', 'Platform', 'Description', 'Incident Date',
    'Total Fraud Amount (INR)', 'Total Lien Amount (INR)', 'Recovery Rate (%)', 'Golden Hour',
    'Registered By', 'Filed At',
  ];

  const rows = tickets.map((t) => {
    const agent = t.registeredBy;
    return [
      t.complaintId,
      t.status,
      t.callDisposition ?? '',
      t.victimDetails.name,
      t.victimDetails.contactNumber,
      t.victimDetails.alternateContact ?? '',
      t.victimDetails.email ?? '',
      t.victimDetails.district ?? '',
      t.victimDetails.state ?? '',
      t.victimDetails.address ?? '',
      t.categoryDetails.category,
      t.categoryDetails.subCategory,
      t.categoryDetails.platform ?? '',
      t.categoryDetails.description ?? '',
      t.incidentDateTime ? new Date(t.incidentDateTime).toLocaleString('en-IN') : '',
      t.totalFraudAmount,
      t.totalLienAmount,
      t.recoveryRate,
      t.isGoldenHour ? 'Yes' : 'No',
      agent?.name ?? 'Unknown',
      new Date(t.createdAt).toLocaleString('en-IN'),
    ].map(escapeCsv).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `crm1930-report-${dateStr}.csv`;

  res
    .setHeader('Content-Type', 'text/csv; charset=utf-8')
    .setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    .setHeader('Cache-Control', 'no-store')
    .send(csv);
});

export default router;
