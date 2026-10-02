// ─── models/Counter.js ─────────────────────────────────────────────────────
// Atomic auto-increment counter for generating unique complaint IDs.
// Uses MongoDB findOneAndUpdate with $inc to guarantee uniqueness under
// concurrent load (no race condition possible).
// ───────────────────────────────────────────────────────────────────────────

'use strict';

import mongoose from 'mongoose';

const CounterSchema = new mongoose.Schema({
  _id:   { type: String, required: true },
  seq:   { type: Number, default: 0 },
});

const Counter = mongoose.models.Counter || mongoose.model('Counter', CounterSchema);

/**
 * getNextSeq(name) — atomically increment and return the next sequence number.
 * @param {string} name - Counter name (e.g. 'complaint')
 * @returns {Promise<number>}
 */
export async function getNextSeq(name) {
  const result = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );
  return result.seq;
}

export default Counter;
