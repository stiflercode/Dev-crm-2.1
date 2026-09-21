import mongoose, { Document, Model, Schema } from 'mongoose';

export type TicketStatus =
  | 'DRAFT'
  | 'L1_REGISTERED'
  | 'L2_PENDING'
  | 'REGISTERED_IN_NCCRP'
  | 'LIEN_CONFIRMED';

export type CallDisposition =
  | 'CYBER_FRAUD_COMPLAINT'
  | 'BLANK_CALL'
  | 'ENQUIRY'
  | 'MISDIAL'
  | 'REPEAT_CALLER';

export type IdentificationType =
  | 'AADHAAR'
  | 'PAN'
  | 'VOTER_ID'
  | 'PASSPORT'
  | 'DRIVING_LICENCE'
  | 'OTHER';

export interface ITransaction {
  _id?: mongoose.Types.ObjectId;
  utrNumber: string;
  bankName: string;
  accountNumber?: string;
  upiId?: string;
  transactionAmount: number;
  transactionDateTime: Date;
  referenceNumber?: string;
  nccrpAckNumber?: string;
  lienAmount?: number;
  lienVerifiedBy?: string;
  lienVerifiedAt?: Date;
  transactionRemarks?: string;
  paymentGatewayDetails?: string;
  affectedSystemDetails?: string;
  merchantInfo?: string;
  proofOfOwnership?: string;
}

export interface IVictimDetails {
  name: string;
  contactNumber: string;
  alternateContact?: string;
  address?: string;
  district?: string;
  state?: string;
  email?: string;
}

export interface ISuspectAddress {
  houseNo?: string;
  streetName?: string;
  colony?: string;
  villageTownCity?: string;
  country?: string;
  state?: string;
  district?: string;
  pincode?: string;
}

export interface ISuspectDetails {
  name?: string;
  mobileNumber?: string;
  email?: string;
  bankAccountOrUPI?: string;
  address?: ISuspectAddress;
  remarks?: string;
}

export interface IIdentificationDetails {
  type?: IdentificationType;
  id?: string;
}

export interface ICategoryDetails {
  category: string;
  subCategory: string;
  platform?: string;
  platformUrl?: string;
  platformHandle?: string;
  description?: string;
}

export interface ITicket extends Document {
  _id: mongoose.Types.ObjectId;
  complaintId: string;
  status: TicketStatus;
  isDraft: boolean;
  callDisposition?: CallDisposition;
  victimDetails: IVictimDetails;
  nearestPoliceStation?: string;
  identificationDetails?: IIdentificationDetails;
  sensitivity: boolean;
  priority: boolean;
  categoryDetails: ICategoryDetails;
  suspectDetails?: ISuspectDetails;
  transactions: ITransaction[];
  totalFraudAmount: number;
  totalLienAmount: number;
  recoveryRate: number;
  isGoldenHour: boolean;
  incidentDateTime?: Date;
  registeredBy: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>({
  utrNumber: { type: String, required: true, trim: true },
  bankName: { type: String, required: true, trim: true },
  accountNumber: { type: String, trim: true },
  upiId: { type: String, trim: true },
  transactionAmount: { type: Number, required: true, min: 0 },
  transactionDateTime: { type: Date, required: true },
  referenceNumber: { type: String, trim: true },
  nccrpAckNumber: { type: String, trim: true },
  lienAmount: { type: Number, min: 0 },
  lienVerifiedBy: { type: String },
  lienVerifiedAt: { type: Date },
  transactionRemarks: { type: String },
  paymentGatewayDetails: { type: String },
  affectedSystemDetails: { type: String },
  merchantInfo: { type: String },
  proofOfOwnership: { type: String },
});

const VictimDetailsSchema = new Schema<IVictimDetails>({
  name: { type: String, required: true, trim: true },
  contactNumber: { type: String, required: true, trim: true },
  alternateContact: { type: String, trim: true },
  address: { type: String, trim: true },
  district: { type: String, trim: true },
  state: { type: String, trim: true, default: 'Maharashtra' },
  email: { type: String, trim: true, lowercase: true },
});

const SuspectAddressSchema = new Schema<ISuspectAddress>({
  houseNo: { type: String, trim: true },
  streetName: { type: String, trim: true },
  colony: { type: String, trim: true },
  villageTownCity: { type: String, trim: true },
  country: { type: String, trim: true, default: 'India' },
  state: { type: String, trim: true },
  district: { type: String, trim: true },
  pincode: { type: String, trim: true },
});

const SuspectDetailsSchema = new Schema<ISuspectDetails>({
  name: { type: String, trim: true },
  mobileNumber: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  bankAccountOrUPI: { type: String, trim: true },
  address: { type: SuspectAddressSchema },
  remarks: { type: String },
});

const IdentificationDetailsSchema = new Schema<IIdentificationDetails>({
  type: {
    type: String,
    enum: ['AADHAAR', 'PAN', 'VOTER_ID', 'PASSPORT', 'DRIVING_LICENCE', 'OTHER'],
  },
  id: { type: String, trim: true },
});

const CategoryDetailsSchema = new Schema<ICategoryDetails>({
  category: { type: String, required: true },
  subCategory: { type: String, required: true },
  platform: { type: String },
  platformUrl: { type: String },
  platformHandle: { type: String },
  description: { type: String },
});

const TicketSchema = new Schema<ITicket>(
  {
    complaintId: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['DRAFT', 'L1_REGISTERED', 'L2_PENDING', 'REGISTERED_IN_NCCRP', 'LIEN_CONFIRMED'],
      default: 'L1_REGISTERED',
    },
    isDraft: { type: Boolean, default: false },
    callDisposition: {
      type: String,
      enum: ['CYBER_FRAUD_COMPLAINT', 'BLANK_CALL', 'ENQUIRY', 'MISDIAL', 'REPEAT_CALLER'],
    },
    victimDetails: { type: VictimDetailsSchema, required: true },
    nearestPoliceStation: { type: String, trim: true },
    identificationDetails: { type: IdentificationDetailsSchema },
    sensitivity: { type: Boolean, default: false },
    priority: { type: Boolean, default: false },
    categoryDetails: { type: CategoryDetailsSchema, required: true },
    suspectDetails: { type: SuspectDetailsSchema },
    transactions: { type: [TransactionSchema], default: [] },
    totalFraudAmount: { type: Number, default: 0 },
    totalLienAmount: { type: Number, default: 0 },
    recoveryRate: { type: Number, default: 0 },
    isGoldenHour: { type: Boolean, default: false },
    incidentDateTime: { type: Date },
    registeredBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Index for L2 pending lien queue (T+1 tickets)
TicketSchema.index({ status: 1, createdAt: 1 });
TicketSchema.index({ isGoldenHour: 1, createdAt: -1 });
TicketSchema.index({ 'victimDetails.contactNumber': 1 });
TicketSchema.index({ registeredBy: 1, createdAt: -1 });

const Ticket: Model<ITicket> =
  mongoose.models.Ticket || mongoose.model<ITicket>('Ticket', TicketSchema);

export default Ticket;
