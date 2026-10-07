// ─── middleware/objectAuth.js ──────────────────────────────────────────────
// Centralized BOLA / IDOR protection middleware.
//
// OWASP API Security #1 — Broken Object Level Authorization (BOLA)
// https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/
//
// This module provides:
//   1. validateObjectId()  — reject malformed MongoDB ObjectIds early
//   2. requireOwnership()  — ensure the requester owns the target resource
//   3. preventSelfTarget() — block admin actions on their own account
//   4. enforceTicketAccess() — role-aware ticket access (L1 own only, L2/L3 all)
//
// ⚠️  APPSEC TEST POINT #6 — BROKEN OBJECT LEVEL AUTHORIZATION (BOLA/IDOR)
// ─────────────────────────────────────────────────────────────────────────────
// To simulate IDOR:
//   - Remove enforceTicketAccess() from a route → any user can access any ticket
//   - Remove validateObjectId() → crash server with malformed IDs
//   - Remove preventSelfTarget() → admin can disable their own account
// ─────────────────────────────────────────────────────────────────────────────

'use strict';

import mongoose from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// validateObjectId(...paramNames)
//
// Express middleware factory that validates one or more req.params as valid
// MongoDB ObjectIds. Returns 400 Bad Request if any are invalid.
//
// Usage:
//   router.get('/:id', validateObjectId('id'), handler)
//   router.patch('/:id/transaction/:txId', validateObjectId('id', 'txId'), handler)
// ─────────────────────────────────────────────────────────────────────────────
export function validateObjectId(...paramNames) {
  return (req, res, next) => {
    for (const name of paramNames) {
      const value = req.params[name];
      if (!value || !mongoose.Types.ObjectId.isValid(value)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: `Invalid resource identifier: '${name}' is not a valid ID.`,
        });
      }
    }
    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// requireOwnership(Model, options)
//
// Generic ownership check middleware factory. Loads the target document by
// req.params[paramName] (default: 'id') and verifies that the value of
// `ownerField` on the document matches req.user.id.
//
// Options:
//   paramName   — req.params key to look up (default: 'id')
//   ownerField  — field on the document that holds the owner's ID (default: 'registeredBy')
//   bypassRoles — array of roles allowed to skip the ownership check (e.g. ['L2', 'L3'])
//   attachAs    — if set, attach the loaded document to req[attachAs] for reuse downstream
//
// Usage:
//   router.patch('/:id/disposition',
//     validateObjectId('id'),
//     requireOwnership(Ticket, { ownerField: 'registeredBy', bypassRoles: ['L2', 'L3'], attachAs: 'ticket' }),
//     handler
//   )
// ─────────────────────────────────────────────────────────────────────────────
export function requireOwnership(Model, options = {}) {
  const {
    paramName = 'id',
    ownerField = 'registeredBy',
    bypassRoles = [],
    attachAs = null,
  } = options;

  return async (req, res, next) => {
    const docId = req.params[paramName];

    // Bypass check for privileged roles
    if (bypassRoles.length > 0 && bypassRoles.includes(req.user.role)) {
      // Still load the document to verify it exists
      const doc = await Model.findById(docId).lean();
      if (!doc) {
        return res.status(404).json({ error: 'Not Found', message: 'Resource does not exist.' });
      }
      if (attachAs) req[attachAs] = doc;
      return next();
    }

    const doc = await Model.findById(docId).lean();

    if (!doc) {
      // Return 404 instead of 403 to avoid revealing that the resource exists
      // (OWASP: don't leak resource existence to unauthorized users)
      return res.status(404).json({ error: 'Not Found', message: 'Resource does not exist.' });
    }

    // Compare the owner field to the authenticated user's ID
    const ownerId = doc[ownerField]?.toString?.() ?? doc[ownerField];
    if (ownerId !== req.user.id) {
      // 🔒 Return 404 (not 403) to prevent enumeration — attacker cannot distinguish
      // "resource doesn't exist" from "resource belongs to someone else".
      return res.status(404).json({ error: 'Not Found', message: 'Resource does not exist.' });
    }

    if (attachAs) req[attachAs] = doc;
    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// enforceTicketAccess(options)
//
// Specialized middleware for ticket access control:
//   - L1 agents can only access tickets they registered
//   - L2/L3 can access any ticket
//
// Loads the ticket and attaches it to req.ticket for downstream handlers.
//
// Options:
//   paramName — req.params key to look up (default: 'id')
// ─────────────────────────────────────────────────────────────────────────────
export function enforceTicketAccess(options = {}) {
  const { paramName = 'id' } = options;

  return async (req, res, next) => {
    const docId = req.params[paramName];

    // Validate ObjectId
    if (!docId || !mongoose.Types.ObjectId.isValid(docId)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Invalid ticket identifier.`,
      });
    }

    const Ticket = (await import('../models/Ticket.js')).default;
    const ticket = await Ticket.findById(docId).lean();

    if (!ticket) {
      return res.status(404).json({ error: 'Not Found', message: 'Ticket does not exist.' });
    }

    // 🔒 BOLA GUARD: L1 agents can only access their own tickets
    if (req.user.role === 'L1') {
      const ownerId = ticket.registeredBy?.toString?.() ?? ticket.registeredBy;
      if (ownerId !== req.user.id) {
        // Return 404 to prevent enumeration
        return res.status(404).json({ error: 'Not Found', message: 'Ticket does not exist.' });
      }
    }

    req.ticket = ticket;
    next();
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// preventSelfTarget(paramName)
//
// Prevents an admin from targeting their own account with destructive operations
// (e.g., disabling themselves, resetting their own password via admin endpoint).
//
// Usage:
//   router.patch('/:id/toggle', preventSelfTarget('id'), handler)
// ─────────────────────────────────────────────────────────────────────────────
export function preventSelfTarget(paramName = 'id') {
  return (req, res, next) => {
    if (req.params[paramName] === req.user.id) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You cannot perform this action on your own account. Use the profile settings instead.',
      });
    }
    next();
  };
}
