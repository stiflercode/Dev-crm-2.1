// ─── routes/lien.js ────────────────────────────────────────────────────────
// Lien management endpoints — L2/L3 access only.
//
//   GET  /api/lien/pending        — T+1 queue of pending lien tickets
//   GET  /api/lien/:id            — Single ticket (L2/L3 view)
//   PATCH /api/lien/:id/transaction/:txId — Update lien on a transaction
// ───────────────────────────────────────────────────────────────────────────

'use strict';

import { Router } from 'express';
import mongoose from 'mongoose';
import Ticket from '../models/Ticket.js';
import { verifyToken, requireRole } from '../middleware/verifyToken.js';

const router = Router();
router.use(verifyToken, requireRole('L2', 'L3'));

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/lien/pending
// T+1 queue: financial-category tickets older than 1h still in pending states
// ─────────────────────────────────────────────────────────────────────────────
router.get('/pending', async (_req, res) => {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);

  const tickets = await Ticket.find({
    status: { $in: ['L2_PENDING', 'L1_REGISTERED'] },
    'categoryDetails.category': {
      $in: ['Financial Fraud', 'E-Commerce Fraud', 'Matrimonial / Romance Fraud'],
    },
    createdAt: { $lte: cutoff },
  })
    .populate('registeredBy', 'name extension')
    .sort({ isGoldenHour: -1, createdAt: 1 })
    .lean();

  res.json({
    tickets: tickets.map((t) => ({
      ...t,
      _id: t._id.toString(),
      registeredBy: t.registeredBy
        ? { ...(t.registeredBy), _id: t.registeredBy._id?.toString() }
        : null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    })),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/lien/:id
// Single ticket detail view
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const ticket = await Ticket.findById(req.params.id)
    .populate('registeredBy', 'name extension')
    .lean();

  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  res.json({
    ticket: {
      ...ticket,
      _id: ticket._id.toString(),
      registeredBy: ticket.registeredBy
        ? { ...(ticket.registeredBy), _id: ticket.registeredBy._id?.toString() }
        : null,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/lien/:id/transaction/:txId
// Body: { nccrpAckNumber: string, lienAmount: number }
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/transaction/:txId', async (req, res) => {
  const { nccrpAckNumber, lienAmount } = req.body;

  if (!nccrpAckNumber || lienAmount === undefined) {
    return res.status(400).json({ error: 'nccrpAckNumber and lienAmount are required' });
  }

  const result = await Ticket.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        'transactions.$[elem].nccrpAckNumber': nccrpAckNumber,
        'transactions.$[elem].lienAmount': lienAmount,
        'transactions.$[elem].lienVerifiedBy': req.user.name,
        'transactions.$[elem].lienVerifiedAt': new Date(),
      },
    },
    {
      arrayFilters: [{ 'elem._id': new mongoose.Types.ObjectId(req.params.txId) }],
      new: true,
    }
  );

  if (!result) return res.status(404).json({ error: 'Ticket not found' });

  // Recalculate totals
  const totalLienAmount = result.transactions.reduce((s, t) => s + (t.lienAmount || 0), 0);
  const recoveryRate =
    result.totalFraudAmount > 0
      ? Math.min(100, (totalLienAmount / result.totalFraudAmount) * 100)
      : 0;

  await Ticket.findByIdAndUpdate(req.params.id, {
    $set: {
      totalLienAmount,
      recoveryRate: parseFloat(recoveryRate.toFixed(2)),
      status: result.transactions.every((t) => t.nccrpAckNumber)
        ? 'REGISTERED_IN_NCCRP'
        : result.status,
    },
  });

  res.json({ success: true, totalLienAmount, recoveryRate: parseFloat(recoveryRate.toFixed(2)) });
});

export default router;
