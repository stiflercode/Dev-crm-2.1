'use client';

import { useEffect } from 'react';
import { useGoldenHourStore, type GoldenHourAlert } from '@/store/goldenHourStore';
import { X, Zap, Copy, Phone, Clock, IndianRupee, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function buildCopySummary(alert: GoldenHourAlert): string {
  return `
=== GOLDEN HOUR ALERT — IMMEDIATE ACTION REQUIRED ===
Complaint ID   : ${alert.complaintId}
Victim Name    : ${alert.victimName}
Contact        : ${alert.victimContact}
Category       : ${alert.category} → ${alert.subCategory}
Fraud Amount   : ₹${alert.totalFraudAmount.toLocaleString('en-IN')}
Incident Time  : ${new Date(alert.incidentDateTime).toLocaleString('en-IN')}
Time Elapsed   : ${alert.minutesSinceIncident} minutes ago
Registered By  : ${alert.registeredByName}
Registered At  : ${new Date(alert.registeredAt).toLocaleString('en-IN')}
================================================
ACTION: Contact victim immediately. Initiate bank freeze / NCCRP filing.
`.trim();
}

interface GoldenHourModalProps {
  className?: string;
}

export function GoldenHourModal({ className }: GoldenHourModalProps) {
  const { isModalOpen, activeAlert, alerts, dismissAlert, openModal } =
    useGoldenHourStore();
  const { toast } = useToast();

  // SSE connection — preserved exactly as-is
  useEffect(() => {
    const evtSource = new EventSource('/api/sse/golden-hour');

    evtSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'GOLDEN_HOUR_ALERT') {
          useGoldenHourStore.getState().pushAlert({
            id: data.id,
            complaintId: data.complaintId,
            victimName: data.victimName,
            victimContact: data.victimContact,
            category: data.category,
            subCategory: data.subCategory,
            totalFraudAmount: data.totalFraudAmount,
            incidentDateTime: data.incidentDateTime,
            registeredAt: data.pushedAt,
            registeredByName: data.registeredByName,
            minutesSinceIncident: Math.floor(
              (Date.now() - new Date(data.incidentDateTime).getTime()) / 60000
            ),
          });

          if (!useGoldenHourStore.getState().isModalOpen) {
            toast({
              title: '⚡ Golden Hour Alert',
              description: `New case: ${data.complaintId} — ${formatCurrency(data.totalFraudAmount)}`,
            });
          }
        }
      } catch {
        // ignore parse errors
      }
    };

    evtSource.onerror = () => {
      // SSE auto-reconnects on disconnect
    };

    return () => evtSource.close();
  }, [toast]);

  if (!isModalOpen || !activeAlert) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(buildCopySummary(activeAlert));
    toast({ title: 'Copied', description: 'Case summary copied to clipboard.' });
  };

  const handleDismiss = () => dismissAlert(activeAlert.id);

  return (
    <div className={cn('golden-hour-overlay animate-fade-in-up', className)}>
      <div className="golden-hour-modal relative">

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            {/* Priority badge */}
            <div className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5"
              style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <Zap className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-bold uppercase tracking-wide text-red-500">Golden Hour</span>
            </div>
            {alerts.length > 1 && (
              <span className="text-[10px] font-semibold rounded px-2 py-0.5"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.2)' }}>
                {alerts.length} pending
              </span>
            )}
          </div>
          <button
            onClick={handleDismiss}
            className="transition-colors rounded-md p-1 hover:bg-[var(--bg-elevated)]"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sub-header */}
        <div className="mb-4">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
            Immediate intervention required
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Case within 3 hours of incident — initiate bank freeze and NCCRP filing now
          </p>
        </div>

        {/* Alert tabs (multiple alerts) */}
        {alerts.length > 1 && (
          <div className="flex gap-1.5 mb-4 flex-wrap">
            {alerts.map((alert) => (
              <button
                key={alert.id}
                onClick={() => openModal(alert)}
                className={cn(
                  'text-[11px] px-2.5 py-1 rounded border transition-colors font-mono',
                  alert.id === activeAlert.id
                    ? 'text-red-500'
                    : ''
                )}
                style={
                  alert.id === activeAlert.id
                    ? { background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.3)' }
                    : { borderColor: 'var(--border-default)', color: 'var(--text-muted)' }
                }
              >
                {alert.complaintId}
              </button>
            ))}
          </div>
        )}

        {/* Priority info row */}
        <div className="flex items-center gap-2 p-3 rounded-lg mb-4"
          style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
          <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1 text-xs">
              <Clock className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
              <span className="text-red-500 font-semibold">{activeAlert.minutesSinceIncident} mins</span>
              <span style={{ color: 'var(--text-muted)' }}>since incident</span>
            </span>
            <span className="flex items-center gap-1 text-xs">
              <IndianRupee className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
              <span className="text-red-500 font-semibold">{formatCurrency(activeAlert.totalFraudAmount)}</span>
              <span style={{ color: 'var(--text-muted)' }}>at risk</span>
            </span>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <InfoRow label="Complaint ID" value={activeAlert.complaintId} mono />
          <InfoRow icon={<Phone className="w-3 h-3" />} label="Victim Contact" value={activeAlert.victimContact} />
          <InfoRow label="Victim Name" value={activeAlert.victimName} />
          <InfoRow label="Category" value={activeAlert.category} />
          <InfoRow label="Sub-Category" value={activeAlert.subCategory} className="col-span-2" />
          <InfoRow label="Registered By" value={activeAlert.registeredByName} />
          <InfoRow label="Filed At" value={new Date(activeAlert.registeredAt).toLocaleTimeString('en-IN')} />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={handleCopy}
            variant="outline"
            size="sm"
            className="flex-1 h-8 text-xs gap-1.5"
            style={{
              borderColor: 'var(--border-default)',
              color: 'var(--text-body)',
              background: 'var(--bg-surface)',
            }}
          >
            <Copy className="w-3.5 h-3.5" />
            Copy Summary
          </Button>
          <Button
            onClick={handleDismiss}
            size="sm"
            className="flex-1 h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Acknowledge &amp; Close
          </Button>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon, label, value, mono, className,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn('rounded-lg p-2.5 border', className)}
      style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
    >
      <p
        className="text-[10px] mb-1 flex items-center gap-1 uppercase tracking-wider font-semibold"
        style={{ color: 'var(--text-muted)' }}
      >
        {icon}
        {label}
      </p>
      <p className={cn(
        'text-sm font-medium',
        mono && 'font-mono text-[11px]'
      )}
        style={{ color: 'var(--text-body)' }}
      >
        {value}
      </p>
    </div>
  );
}
