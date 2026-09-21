'use client';

import { useGoldenHourStore } from '@/store/goldenHourStore';
import { GoldenHourModal } from '@/components/shared/GoldenHourModal';
import { Zap, Bell, Copy, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

export default function GoldenHourAlertsPage() {
  const { alerts, openModal, dismissAlert } = useGoldenHourStore();
  const { toast } = useToast();

  return (
    <div className="w-full space-y-6 animate-fade-in-up">
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2.5">
            <Zap className="w-6 h-6 text-red-500" />
            Golden Hour Alerts
          </h1>
          <p className="page-subtitle">Real-time SSE feed — cases within 3 hours of incident</p>
        </div>
        {alerts.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg px-3 py-1.5"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <Bell className="w-3.5 h-3.5 text-red-500" />
            <span className="text-xs font-semibold" style={{ color: '#DC2626' }}>
              {alerts.length} active alert{alerts.length > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Live connection status */}
      <div className="inline-flex items-center gap-2 text-xs rounded-lg px-3 py-2"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-secondary)' }}>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
        Live connection active — alerts appear automatically
      </div>

      {/* Alert list */}
      {alerts.length === 0 ? (
        <div className="form-section py-16 text-center">
          <div className="flex items-center justify-center w-14 h-14 rounded-full mx-auto mb-4"
            style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <Zap className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
            No Active Alerts
          </h3>
          <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
            Golden Hour alerts appear here automatically when L1 registers a complaint within 3 hours of incident.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="form-section"
              style={{ borderLeftWidth: '4px', borderLeftColor: '#EF4444' }}>
              {/* Header row */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5 rounded-md px-2 py-1"
                    style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <Zap className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: '#DC2626' }}>
                      Golden Hour
                    </span>
                  </div>
                  <span className="font-mono text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                    {alert.complaintId}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${alert.complaintId} | ${alert.victimName} | ${alert.victimContact} | ₹${alert.totalFraudAmount.toLocaleString('en-IN')}`
                      );
                      toast({ title: 'Copied' });
                    }}
                    className="flex items-center gap-1.5 h-7 px-2.5 text-xs rounded-md border transition-colors"
                    style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', background: 'var(--bg-surface)' }}>
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                  <button onClick={() => openModal(alert)}
                    className="btn-primary h-7 text-xs px-3 gap-1.5">
                    <Zap className="w-3 h-3" /> View
                  </button>
                  <button onClick={() => dismissAlert(alert.id)}
                    className="flex items-center justify-center w-7 h-7 rounded-md transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseOver={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                    onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <InfoTile label="Victim" primary={alert.victimName} secondary={alert.victimContact} mono />
                <InfoTile label="Category" primary={alert.subCategory} secondary={alert.category} />
                <InfoTile label="Fraud Amount" primary={formatCurrency(alert.totalFraudAmount)} danger />
                <InfoTile label="Time Elapsed" primary={`${alert.minutesSinceIncident} min ago`} warning />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <GoldenHourModal />
    </div>
  );
}

function InfoTile({ label, primary, secondary, mono, danger, warning }: {
  label: string; primary: string; secondary?: string;
  mono?: boolean; danger?: boolean; warning?: boolean;
}) {
  return (
    <div className="rounded-xl p-3"
      style={{
        background: danger ? 'rgba(239,68,68,0.04)' : warning ? 'rgba(245,158,11,0.04)' : 'var(--bg-elevated)',
        border: `1px solid ${danger ? 'rgba(239,68,68,0.12)' : warning ? 'rgba(245,158,11,0.12)' : 'var(--border-default)'}`,
      }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </p>
      <p className={`text-sm font-semibold ${mono ? 'font-mono' : ''}`}
        style={{ color: danger ? '#DC2626' : warning ? '#D97706' : 'var(--text-heading)' }}>
        {primary}
      </p>
      {secondary && (
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{secondary}</p>
      )}
    </div>
  );
}
