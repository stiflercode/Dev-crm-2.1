import mongoose, { Document, Model, Schema } from 'mongoose';

export type BreakType = 'LUNCH' | 'TEA' | 'BIO' | 'TRAINING' | 'FEEDBACK_QUERY';
export type AgentStatus = 'AVAILABLE' | 'ON_CALL' | 'WRAP_UP' | 'ON_BREAK' | 'OFFLINE';

export interface IBreakEntry {
  _id?: mongoose.Types.ObjectId;
  breakType: BreakType;
  isCapped: boolean;
  startTime: Date;
  endTime?: Date;
  durationSeconds?: number;
}

export interface IAgentSession extends Document {
  _id: mongoose.Types.ObjectId;
  agentId: mongoose.Types.ObjectId;
  shiftDate: Date;
  totalTalkTimeSeconds: number;
  totalWrapUpTimeSeconds: number;
  totalAvailableTimeSeconds: number;
  ticketsRegistered: number;
  currentStatus: AgentStatus;
  statusChangedAt: Date;
  breaks: IBreakEntry[];
  createdAt: Date;
  updatedAt: Date;
}

const BreakEntrySchema = new Schema<IBreakEntry>({
  breakType: {
    type: String,
    enum: ['LUNCH', 'TEA', 'BIO', 'TRAINING', 'FEEDBACK_QUERY'],
    required: true,
  },
  isCapped: { type: Boolean, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  durationSeconds: { type: Number },
});

const AgentSessionSchema = new Schema<IAgentSession>(
  {
    agentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    shiftDate: { type: Date, required: true },
    totalTalkTimeSeconds: { type: Number, default: 0 },
    totalWrapUpTimeSeconds: { type: Number, default: 0 },
    totalAvailableTimeSeconds: { type: Number, default: 0 },
    ticketsRegistered: { type: Number, default: 0 },
    currentStatus: {
      type: String,
      enum: ['AVAILABLE', 'ON_CALL', 'WRAP_UP', 'ON_BREAK', 'OFFLINE'],
      default: 'OFFLINE',
    },
    statusChangedAt: { type: Date, default: Date.now },
    breaks: { type: [BreakEntrySchema], default: [] },
  },
  { timestamps: true }
);

// Compound unique index: one session per agent per day
AgentSessionSchema.index({ agentId: 1, shiftDate: 1 }, { unique: true });
AgentSessionSchema.index({ currentStatus: 1, shiftDate: 1 });

const AgentSession: Model<IAgentSession> =
  mongoose.models.AgentSession ||
  mongoose.model<IAgentSession>('AgentSession', AgentSessionSchema);

export default AgentSession;
