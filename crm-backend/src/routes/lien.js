// ─── routes/lien.js ────────────────────────────────────────────────────────
// Lien management endpoints — L2/L3 access only.
//
//   GET  /api/lien/pending        — T+1 queue of pending lien tickets
//   GET  /api/lien/:id            — Single ticket (L2/L3 view)
//   PATCH /api/lien/:id/transaction/:txId — Update lien on a transaction
//
// 🔒 BOLA/IDOR PROTECTIONS (OWASP API #1):
//   - validateObjectId() on all :id and :txId parameters
//   - Target ticket existence verified before mutation
//   - Transaction existence verified within the target ticket
//   - lienVerifiedBy uses req.user.id (not just name string) for audit
//   - lienAmount validated against transactionAmount to prevent inflation
// ───────────────────────────────────────────────────────────────────────────

'use strict';

import { Router } from 'express';
import mongoose from 'mongoose';
import Ticket from '../models/Ticket.js';
import { verifyToken, requireRole } from '../middleware/verifyToken.js';
import { validateObjectId } from '../middleware/objectAuth.js';

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
//
// 🔒 BOLA: ObjectId validated. Ticket existence confirmed before returning.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:id', validateObjectId('id'), async (req, res) => {
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
//
// 🔒 BOLA PROTECTIONS:
//   - Both :id and :txId validated as valid ObjectIds
//   - Ticket existence verified before update
//   - Transaction existence verified within the specific ticket
//     (prevents cross-ticket transaction manipulation)
//   - lienAmount validated: must be non-negative and ≤ transactionAmount
//   - Audit trail uses req.user.id (not just display name)
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/transaction/:txId',
  validateObjectId('id', 'txId'),
  async (req, res) => {
    const { nccrpAckNumber, lienAmount } = req.body;

    if (!nccrpAckNumber || lienAmount === undefined) {
      return res.status(400).json({ error: 'nccrpAckNumber and lienAmount are required' });
    }

    if (typeof lienAmount !== 'number' || lienAmount < 0) {
      return res.status(400).json({ error: 'lienAmount must be a non-negative number' });
    }

    // 🔒 BOLA: Load the ticket first to verify it exists and the transaction belongs to it
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // 🔒 BOLA: Verify the transaction actually belongs to THIS ticket
    // Prevents IDOR where attacker uses a valid txId from a different ticket
    const targetTx = ticket.transactions.find(
      (t) => t._id?.toString() === req.params.txId
    );
    if (!targetTx) {
      return res.status(404).json({ error: 'Transaction not found in this ticket' });
    }

    // 🔒 Business rule: lien amount cannot exceed the original transaction amount
    if (lienAmount > targetTx.transactionAmount) {
      return res.status(400).json({
        error: `lienAmount (₹${lienAmount}) cannot exceed transactionAmount (₹${targetTx.transactionAmount})`,
      });
    }

    const result = await Ticket.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          'transactions.$[elem].nccrpAckNumber': nccrpAckNumber,
          'transactions.$[elem].lienAmount': lienAmount,
          // 🔒 Audit trail: use both user ID and name for non-repudiation
          'transactions.$[elem].lienVerifiedBy': `${req.user.name} (${req.user.id})`,
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
  }
);

export default router;
