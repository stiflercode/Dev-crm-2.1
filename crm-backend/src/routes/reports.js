// ─── routes/reports.js ─────────────────────────────────────────────────────
// Reporting endpoints — L2/L3 only.
//
//   GET /api/reports/export-csv — Daily ticket CSV export
// ───────────────────────────────────────────────────────────────────────────

'use strict';

import { Router } from 'express';
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/data
// Returns aggregated report data for today used by the reports dashboard.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/data', async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalTicketsToday,
    totalTicketsWeek,
    goldenHourCases,
    totalFraudToday,
    agentSessions,
    statusBreakdown,
  ] = await Promise.all([
    Ticket.countDocuments({ createdAt: { $gte: today } }),
    Ticket.countDocuments({ createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }),
    Ticket.countDocuments({ isGoldenHour: true, createdAt: { $gte: today } }),
    Ticket.aggregate([
      { $match: { createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$totalFraudAmount' }, lien: { $sum: '$totalLienAmount' } } },
    ]),
    AgentSession.find({ shiftDate: today }).populate('agentId', 'name role extension username').lean(),
    Ticket.aggregate([
      { $match: { createdAt: { $gte: today } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  const fraudStats = totalFraudToday[0] ?? { total: 0, lien: 0 };
  const overallRecovery = fraudStats.total > 0
    ? ((fraudStats.lien / fraudStats.total) * 100).toFixed(1)
    : '0';

  res.json({
    data: {
      totalTicketsToday,
      totalTicketsWeek,
      goldenHourCases,
      totalFraudToday: fraudStats.total,
      totalLienToday: fraudStats.lien,
      overallRecovery,
      agentSessions: agentSessions.map((s) => ({
        ...s,
        _id: s._id.toString(),
        agentId: s.agentId,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      statusBreakdown,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/reports/export-csv
// Exports today's tickets as a CSV file.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/export-csv', async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tickets = await Ticket.find({ createdAt: { $gte: today } })
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
