import { getTicketById } from '@/app/actions/lien';
import { notFound } from 'next/navigation';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LienUpdateModal } from '../../pending-lien/LienUpdateModal';
import { CopyButton } from './CopyButton';
import {
  Zap, User, Tag, CreditCard, TrendingUp,
  IndianRupee, CheckCircle, ArrowLeft, Scale,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Params { params: Promise<{ id: string }> }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildCaseSummary(ticket: any): string {
  const v = ticket.victimDetails as Record<string, string>;
  const c = ticket.categoryDetails as Record<string, string>;
  const txns = ticket.transactions as Array<Record<string, unknown>>;

  const lines = [
    `CASE SUMMARY — ${ticket.complaintId}`,
    `Status         : ${ticket.status}`,
    ``,
    `VICTIM`,
    `Name           : ${v.name}`,
    `Contact        : ${v.contactNumber}`,
    v.alternateContact ? `Alt. Contact   : ${v.alternateContact}` : '',
    v.address ? `Address        : ${v.address}` : '',
    ``,
    `OFFENCE`,
    `Category       : ${c.category}`,
    `Sub-Category   : ${c.subCategory}`,
    c.platform ? `Platform       : ${c.platform}` : '',
    c.platformUrl ? `Profile URL    : ${c.platformUrl}` : '',
    c.description ? `Description    : ${c.description}` : '',
    ``,
    txns.length > 0 ? `TRANSACTIONS (${txns.length})` : '',
    ...txns.map((t, i) =>
      `  ${i + 1}. ₹${(t.transactionAmount as number).toLocaleString('en-IN')} | ${t.bankName} | UTR: ${t.utrNumber}${t.nccrpAckNumber ? ` | NCCRP: ${t.nccrpAckNumber}` : ''}${t.lienAmount ? ` | Lien: ₹${(t.lienAmount as number).toLocaleString('en-IN')}` : ''}`
    ),
    txns.length > 0 ? `  Total Fraud   : ₹${(ticket.totalFraudAmount as number).toLocaleString('en-IN')}` : '',
    txns.length > 0 ? `  Total Lien    : ₹${(ticket.totalLienAmount as number).toLocaleString('en-IN')}` : '',
    txns.length > 0 ? `  Recovery Rate : ${ticket.recoveryRate}%` : '',
    ``,
    `Filed At       : ${new Date(ticket.createdAt as string).toLocaleString('en-IN')}`,
  ].filter(Boolean);

  return lines.join('\n');
}

export default async function TicketDetailPage({ params }: Params) {
  const { id } = await params;
  const { ticket, error } = await getTicketById(id);

  if (error || !ticket) return notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = ticket as any;
  const v = t.victimDetails as Record<string, string>;
  const c = t.categoryDetails as Record<string, string>;
  const txns = t.transactions as Array<Record<string, unknown>>;
  const recoveryRate = t.recoveryRate as number;

  return (
    <div className="max-w-3xl space-y-5 animate-fade-in-up">
      {/* Back link */}
      <Link
        href="/dashboard/l2/tickets"
        className="inline-flex items-center gap-1.5 text-sm transition-colors hover:text-blue-600"
        style={{ color: 'var(--text-muted)' }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to All Tickets
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span
              className="font-mono text-xl font-bold tracking-widest"
              style={{ color: 'var(--text-heading)' }}
            >
              {t.complaintId as string}
            </span>
            {t.isGoldenHour && (
              <span
                className="flex items-center gap-1 text-[11px] font-bold uppercase rounded-full px-2.5 py-1"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  color: '#DC2626',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
              >
                <Zap className="w-3 h-3" />
                Golden Hour
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={t.status as string} size="md" />
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Filed {new Date(t.createdAt as string).toLocaleString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={buildCaseSummary(t)} />
          {txns.length > 0 && (
            <LienUpdateModal ticket={{
              _id: t._id as string,
              complaintId: t.complaintId as string,
              totalFraudAmount: t.totalFraudAmount as number,
              transactions: txns.map((t) => ({
                _id: t._id as string,
                utrNumber: t.utrNumber as string,
                bankName: t.bankName as string,
                transactionAmount: t.transactionAmount as number,
                nccrpAckNumber: t.nccrpAckNumber as string | undefined,
                lienAmount: t.lienAmount as number | undefined,
              })),
            }} />
          )}
        </div>
      </div>

      {/* Victim Details */}
      <div className="form-section">
        <p className="form-section-title">
          <User className="w-3.5 h-3.5" />
          Victim Details
        </p>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <InfoItem label="Full Name" value={v.name} />
          <InfoItem label="Mobile Number" value={v.contactNumber} mono />
          {v.alternateContact && <InfoItem label="Alt. Contact" value={v.alternateContact} mono />}
          {v.email && <InfoItem label="Email" value={v.email} />}
          {v.district && <InfoItem label="District" value={v.district} />}
          {v.state && <InfoItem label="State" value={v.state} />}
          {v.address && <InfoItem label="Address" value={v.address} className="col-span-3" />}
        </div>
      </div>

      {/* Crime Classification */}
      <div className="form-section">
        <p className="form-section-title">
          <Tag className="w-3.5 h-3.5" />
          Crime Classification
        </p>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <InfoItem label="Category" value={c.category} />
          <InfoItem label="Sub-Category" value={c.subCategory} />
          {c.platform && <InfoItem label="Platform" value={c.platform} />}
          {c.platformUrl && <InfoItem label="Profile URL" value={c.platformUrl} mono />}
          {c.platformHandle && <InfoItem label="Handle" value={c.platformHandle} mono />}
          {c.description && <InfoItem label="Description" value={c.description} className="col-span-3" />}
        </div>
      </div>

      {/* Transactions */}
      {txns.length > 0 && (
        <div className="form-section">
          <div className="flex items-center justify-between mb-5">
            <p className="form-section-title mb-0 border-0 pb-0">
              <CreditCard className="w-3.5 h-3.5" />
              Transactions ({txns.length})
            </p>
          </div>

          <div className="space-y-3">
            {txns.map((txn, i) => {
              const hasNccrp = Boolean(txn.nccrpAckNumber);
              return (
                <div
                  key={i}
                  className="p-4 rounded-xl border text-sm"
                  style={{
                    background: hasNccrp ? 'rgba(22,163,74,0.04)' : 'var(--bg-elevated)',
                    borderColor: hasNccrp ? 'rgba(22,163,74,0.2)' : 'var(--border-default)',
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Transaction {i + 1}
                    </span>
                    {hasNccrp ? (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle className="w-3 h-3" />
                        NCCRP Filed
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        Pending NCCRP
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <InfoItem label="Bank" value={txn.bankName as string} />
                    <InfoItem label="UTR No." value={txn.utrNumber as string} mono />
                    <InfoItem
                      label="Amount"
                      value={`₹${(txn.transactionAmount as number).toLocaleString('en-IN')}`}
                      highlight
                    />
                    {(txn.nccrpAckNumber as string | undefined) && (
                      <InfoItem label="NCCRP ACK" value={txn.nccrpAckNumber as string} mono />
                    )}
                    {(txn.lienAmount as number | undefined) ? (
                      <InfoItem
                        label="Lien Amount"
                        value={`₹${(txn.lienAmount as number).toLocaleString('en-IN')}`}
                        success
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recovery Summary */}
          <div
            className="flex flex-wrap items-center gap-6 mt-4 p-4 rounded-xl border"
            style={{
              background: 'var(--bg-elevated)',
              borderColor: 'var(--border-default)',
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(245,158,11,0.08)' }}
              >
                <IndianRupee className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Fraud</p>
                <p className="text-sm font-bold text-amber-600 dark:text-amber-400 fin-number">
                  ₹{(t.totalFraudAmount as number).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'rgba(22,163,74,0.08)' }}
              >
                <Scale className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Lien</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 fin-number">
                  ₹{(t.totalLienAmount as number).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{
                  background: recoveryRate >= 80
                    ? 'rgba(22,163,74,0.08)'
                    : recoveryRate >= 40
                    ? 'rgba(245,158,11,0.08)'
                    : 'rgba(239,68,68,0.08)',
                }}
              >
                <TrendingUp className={cn(
                  'w-3.5 h-3.5',
                  recoveryRate >= 80 ? 'text-emerald-600' :
                  recoveryRate >= 40 ? 'text-amber-600' : 'text-red-600'
                )} />
              </div>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Recovery Rate</p>
                <p className={cn(
                  'text-sm font-bold fin-number',
                  recoveryRate >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                  recoveryRate >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                )}>
                  {recoveryRate}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value, mono, highlight, success, className }: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
  success?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <p
        className="text-[10px] font-semibold uppercase tracking-wider mb-1"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </p>
      <p className={cn(
        'text-sm',
        mono ? 'font-mono' : '',
        highlight ? 'font-bold text-amber-600 dark:text-amber-400' :
        success ? 'font-semibold text-emerald-600 dark:text-emerald-400' :
        '',
      )}
        style={!highlight && !success ? { color: 'var(--text-body)' } : undefined}
      >
        {value || '—'}
      </p>
    </div>
  );
}
