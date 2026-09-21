// ─── models/Ticket.js ──────────────────────────────────────────────────────
// Ported from: lib/models/Ticket.ts
// All sub-schemas, indexes, and enums preserved exactly.
// ───────────────────────────────────────────────────────────────────────────

'use strict';

import mongoose from 'mongoose';

// ── Sub-schemas ──────────────────────────────────────────────────────────────

const TransactionSchema = new mongoose.Schema({
  utrNumber:              { type: String, required: true, trim: true },
  bankName:               { type: String, required: true, trim: true },
  accountNumber:          { type: String, trim: true },
  upiId:                  { type: String, trim: true },
  transactionAmount:      { type: Number, required: true, min: 0 },
  transactionDateTime:    { type: Date, required: true },
  referenceNumber:        { type: String, trim: true },
  nccrpAckNumber:         { type: String, trim: true },
  lienAmount:             { type: Number, min: 0 },
  lienVerifiedBy:         { type: String },
  lienVerifiedAt:         { type: Date },
  transactionRemarks:     { type: String },
  paymentGatewayDetails:  { type: String },
  affectedSystemDetails:  { type: String },
  merchantInfo:           { type: String },
  proofOfOwnership:       { type: String },
});

const VictimDetailsSchema = new mongoose.Schema({
  name:             { type: String, required: true, trim: true },
  contactNumber:    { type: String, required: true, trim: true },
  alternateContact: { type: String, trim: true },
  address:          { type: String, trim: true },
  district:         { type: String, trim: true },
  state:            { type: String, trim: true, default: 'Maharashtra' },
  email:            { type: String, trim: true, lowercase: true },
});

const SuspectAddressSchema = new mongoose.Schema({
  houseNo:          { type: String, trim: true },
  streetName:       { type: String, trim: true },
  colony:           { type: String, trim: true },
  villageTownCity:  { type: String, trim: true },
  country:          { type: String, trim: true, default: 'India' },
  state:            { type: String, trim: true },
  district:         { type: String, trim: true },
  pincode:          { type: String, trim: true },
});

const SuspectDetailsSchema = new mongoose.Schema({
  name:             { type: String, trim: true },
  mobileNumber:     { type: String, trim: true },
  email:            { type: String, trim: true, lowercase: true },
  bankAccountOrUPI: { type: String, trim: true },
  address:          { type: SuspectAddressSchema },
  remarks:          { type: String },
});

const IdentificationDetailsSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['AADHAAR', 'PAN', 'VOTER_ID', 'PASSPORT', 'DRIVING_LICENCE', 'OTHER'],
  },
  id: { type: String, trim: true },
});

const CategoryDetailsSchema = new mongoose.Schema({
  category:       { type: String, required: true },
  subCategory:    { type: String, required: true },
  platform:       { type: String },
  platformUrl:    { type: String },
  platformHandle: { type: String },
  description:    { type: String },
});

// ── Root Schema ───────────────────────────────────────────────────────────────

const TicketSchema = new mongoose.Schema(
  {
    complaintId: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['DRAFT', 'L1_REGISTERED', 'L2_PENDING', 'REGISTERED_IN_NCCRP', 'LIEN_CONFIRMED'],
      default: 'L1_REGISTERED',
    },
    isDraft:         { type: Boolean, default: false },
    callDisposition: {
      type: String,
      enum: ['CYBER_FRAUD_COMPLAINT', 'BLANK_CALL', 'ENQUIRY', 'MISDIAL', 'REPEAT_CALLER'],
    },
    victimDetails:          { type: VictimDetailsSchema, required: true },
    nearestPoliceStation:   { type: String, trim: true },
    identificationDetails:  { type: IdentificationDetailsSchema },
    sensitivity:            { type: Boolean, default: false },
    priority:               { type: Boolean, default: false },
    categoryDetails:        { type: CategoryDetailsSchema, required: true },
    suspectDetails:         { type: SuspectDetailsSchema },
    transactions:           { type: [TransactionSchema], default: [] },
    totalFraudAmount:       { type: Number, default: 0 },
    totalLienAmount:        { type: Number, default: 0 },
    recoveryRate:           { type: Number, default: 0 },
    isGoldenHour:           { type: Boolean, default: false },
    incidentDateTime:       { type: Date },
    registeredBy:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo:             { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Compound indexes for L2 lien queue and search operations
TicketSchema.index({ status: 1, createdAt: 1 });
TicketSchema.index({ isGoldenHour: 1, createdAt: -1 });
TicketSchema.index({ 'victimDetails.contactNumber': 1 });
TicketSchema.index({ registeredBy: 1, createdAt: -1 });

const Ticket = mongoose.models.Ticket || mongoose.model('Ticket', TicketSchema);
export default Ticket;
