// ─── models/AgentSession.js ────────────────────────────────────────────────
// Ported from: lib/models/AgentSession.ts
// One session document per agent per shift day.
// ───────────────────────────────────────────────────────────────────────────

'use strict';

import mongoose from 'mongoose';

const BreakEntrySchema = new mongoose.Schema({
  breakType: {
    type: String,
    enum: ['LUNCH', 'TEA', 'BIO', 'TRAINING', 'FEEDBACK_QUERY'],
    required: true,
  },
  isCapped:        { type: Boolean, required: true },
  startTime:       { type: Date, required: true },
  endTime:         { type: Date },
  durationSeconds: { type: Number },
});

const AgentSessionSchema = new mongoose.Schema(
  {
    agentId:                   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    shiftDate:                 { type: Date, required: true },
    totalTalkTimeSeconds:      { type: Number, default: 0 },
    totalWrapUpTimeSeconds:    { type: Number, default: 0 },
    totalAvailableTimeSeconds: { type: Number, default: 0 },
    ticketsRegistered:         { type: Number, default: 0 },
    currentStatus: {
      type: String,
      enum: ['AVAILABLE', 'ON_CALL', 'WRAP_UP', 'ON_BREAK', 'OFFLINE'],
      default: 'OFFLINE',
    },
    statusChangedAt: { type: Date, default: Date.now },
    breaks:          { type: [BreakEntrySchema], default: [] },
  },
  { timestamps: true }
);

// One session per agent per day
AgentSessionSchema.index({ agentId: 1, shiftDate: 1 }, { unique: true });
AgentSessionSchema.index({ currentStatus: 1, shiftDate: 1 });

const AgentSession =
  mongoose.models.AgentSession || mongoose.model('AgentSession', AgentSessionSchema);

export default AgentSession;
