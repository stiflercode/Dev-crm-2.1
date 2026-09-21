'use client';

// ─── app/dashboard/l3/reports/page.tsx ────────────────────────────────────
// Converted from Server Component (auth() + direct DB) to Client Component.
// Report data is fetched from GET /api/reports/data on the Express backend.
// ───────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';
import { Download, TrendingUp, FileText, Users, Clock, Zap, IndianRupee } from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MetricCard } from '@/components/shared/MetricCard';
import { SectionCard } from '@/components/shared/SectionCard';
import { EmptyState } from '@/components/shared/EmptyState';

function fmtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ReportData = any;

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    apiClient.get<{ data: ReportData }>('/api/reports/data')
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  const statusMap = Object.fromEntries(
    (data.statusBreakdown ?? []).map((s: { _id: string; count: number }) => [s._id, s.count])
  );

  const statusItems = [
    { key: 'DRAFT',               label: 'Draft',          variant: 'DRAFT' as const },
    { key: 'L1_REGISTERED',       label: 'L1 Registered',  variant: 'L1_REGISTERED' as const },
    { key: 'L2_PENDING',          label: 'L2 Pending',     variant: 'L2_PENDING' as const },
    { key: 'REGISTERED_IN_NCCRP', label: 'NCCRP Filed',    variant: 'REGISTERED_IN_NCCRP' as const },
    { key: 'LIEN_CONFIRMED',      label: 'Lien Confirmed', variant: 'LIEN_CONFIRMED' as const },
  ];

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics &amp; Reports</h1>
          <p className="page-subtitle">
            Today · {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <a
          href="/api/reports/export-csv"
          className="btn-primary gap-1.5 text-sm h-9 px-4"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </a>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard label="Tickets Today"  value={data.totalTicketsToday} icon={FileText}     />
        <MetricCard label="This Week"      value={data.totalTicketsWeek}  icon={FileText}     />
        <MetricCard label="Golden Hour"    value={data.goldenHourCases}   icon={Zap}          color="red"   />
        <MetricCard label="Fraud Today"    value={`₹${((data.totalFraudToday ?? 0) / 1000).toFixed(1)}K`} icon={IndianRupee} color="amber" />
        <MetricCard label="Lien Secured"   value={`₹${((data.totalLienToday ?? 0) / 1000).toFixed(1)}K`} icon={TrendingUp}  color="green" />
        <MetricCard label="Recovery Rate"  value={`${data.overallRecovery ?? 0}%`} icon={TrendingUp} color="green" />
      </div>

      {/* Status Breakdown */}
      <SectionCard title="Complaint Status Breakdown — Today">
        <div className="flex flex-wrap gap-2.5">
          {statusItems.map(({ key, label, variant }) => (
            <div
              key={key}
              className="flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 border"
              style={{ background: 'var(--bg-elevated)', borderColor: 'var(--border-default)' }}
            >
              <StatusBadge status={variant} size="sm" />
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
              <span className="text-sm font-bold ml-1" style={{ color: 'var(--text-heading)' }}>
                {statusMap[key] ?? 0}
              </span>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Agent Performance Report */}
      <SectionCard
        title="Agent Performance Report — Today"
        description={`${(data.agentSessions ?? []).length} active session(s)`}
        noPadding
      >
        {(data.agentSessions ?? []).length === 0 ? (
          <EmptyState
            icon={Users}
            title="No agent sessions today"
            description="Statistics appear once agents log in and go Available."
            size="sm"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="crm-table-header">
                  {['Agent', 'Login', 'Idle', 'Talk Time', 'Wrap', 'Break', 'Breaks', 'Tickets', 'Status'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 whitespace-nowrap font-semibold text-[11px] uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.agentSessions ?? []).map((s: ReportData) => {
                  const agent = s.agentId;
                  const totalBreakSeconds = (s.breaks ?? []).reduce((sum: number, b: ReportData) => sum + (b.durationSeconds ?? 0), 0);
                  const cappedBreak = (s.breaks ?? [])
                    .filter((b: ReportData) => b.isCapped && b.durationSeconds)
                    .reduce((sum: number, b: ReportData) => sum + (b.durationSeconds ?? 0), 0);
                  const idleSeconds = Math.max(0,
                    (s.totalAvailableTimeSeconds ?? 0) - s.totalTalkTimeSeconds - s.totalWrapUpTimeSeconds - totalBreakSeconds
                  );
                  const isBreachBreak = cappedBreak > 3600;
                  return (
                    <tr key={s._id} className="data-table-row border-b border-[var(--border-muted)]">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                            style={{ background: 'linear-gradient(135deg, #1D4ED8, #2563EB)' }}
                          >
                            {(agent?.name ?? '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-heading)' }}>
                              {agent?.name ?? 'Unknown'}
                            </p>
                            <p className="text-[10px] font-mono truncate" style={{ color: 'var(--text-muted)' }}>
                              {agent?.username} · Ext {agent?.extension}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(s.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {fmtTime(idleSeconds)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="flex items-center gap-1.5 text-xs font-mono" style={{ color: 'var(--text-heading)' }}>
                          <Clock className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                          {fmtTime(s.totalTalkTimeSeconds)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {fmtTime(s.totalWrapUpTimeSeconds)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-xs font-mono ${isBreachBreak ? 'text-amber-600 dark:text-amber-400' : ''}`}
                          style={!isBreachBreak ? { color: 'var(--text-secondary)' } : undefined}>
                          {fmtTime(totalBreakSeconds)}
                        </span>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {fmtTime(cappedBreak)} capped
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-center font-mono" style={{ color: 'var(--text-secondary)' }}>
                        {(s.breaks ?? []).length}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>
                          {s.ticketsRegistered}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusBadge status={s.currentStatus} size="sm" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}