// ─── models/User.js ────────────────────────────────────────────────────────
// Ported from: lib/models/User.ts
// Roles: L1 (Analyst) | L2 (Officer) | L3 (Admin)
// ───────────────────────────────────────────────────────────────────────────

'use strict';

import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name:         { type: String, required: true, trim: true },
    username:     { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role:         { type: String, enum: ['L1', 'L2', 'L3'], required: true },
    extension:    { type: String, required: true, trim: true },
    isActive:     { type: Boolean, default: true },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', UserSchema);
export default User;
