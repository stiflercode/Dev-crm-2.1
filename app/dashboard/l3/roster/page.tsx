'use client';

import { useState, useEffect } from 'react';
import { getAgentRosterForToday } from '@/app/actions/breaks';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Activity, Clock, AlertTriangle, InboxIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return `${h}h ${rm}m`;
  }
  return `${m}m ${s}s`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function RosterPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [roster, setRoster] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = () =>
      getAgentRosterForToday().then(({ roster: r, error: e }) => {
        if (e) setError(e); else setRoster(r ?? []);
        setIsLoading(false);
      });
    load();
    // Auto-refresh every 10 seconds (replaces `export const revalidate = 10`)
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-xl p-4 text-sm"
        style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626' }}>
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />{error}
      </div>
    );
  }

  const available = roster.filter((a) => a.currentStatus === 'AVAILABLE').length;
  const onCall    = roster.filter((a) => a.currentStatus === 'ON_CALL').length;
  const onBreak   = roster.filter((a) => a.currentStatus === 'ON_BREAK').length;
  const breached  = roster.filter((a) => a.isSLABreached).length;

  return (
    <div className="w-full space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl"
            style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)' }}>
            <Activity className="w-5 h-5" style={{ color: '#2563EB' }} />
          </div>
          <div>
            <h1 className="page-title">Live Floor Roster</h1>
            <p className="page-subtitle">{roster.length} agents today · refreshes every 10s</p>
          </div>
        </div>
        {breached > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg px-3 py-1.5"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <span className="text-xs font-semibold" style={{ color: '#DC2626' }}>
              {breached} SLA breach{breached > 1 ? 'es' : ''}
            </span>
          </div>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-4 gap-4">
        <div className="stat-card">
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Available</p>
          <p className="text-2xl font-outfit font-bold" style={{ color: '#16A34A' }}>{available}</p>
        </div>
        <div className="stat-card">
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>On Call</p>
          <p className="text-2xl font-outfit font-bold" style={{ color: '#2563EB' }}>{onCall}</p>
        </div>
        <div className="stat-card">
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>On Break</p>
          <p className="text-2xl font-outfit font-bold" style={{ color: '#D97706' }}>{onBreak}</p>
        </div>
        <div className={cn('stat-card')} style={breached > 0 ? {
          borderColor: 'rgba(239,68,68,0.3)',
          background: 'rgba(239,68,68,0.02)',
        } : {}}>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>SLA Breached</p>
          <p className="text-2xl font-outfit font-bold" style={{ color: breached > 0 ? '#DC2626' : 'var(--text-muted)' }}>
            {breached}
          </p>
        </div>
      </div>

      {/* Roster table */}
      <div className="form-section overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="crm-table-header" style={{ borderBottom: '1px solid var(--border-default)' }}>
                {['Agent', 'Role', 'Ext', 'Status', 'Duration', 'Tickets', 'Break Used', 'Break Type'].map((h) => (
                  <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roster.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <InboxIcon className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No agents logged in today</p>
                  </td>
                </tr>
              ) : (
                roster.map((agent) => {
                  const durationSecs = Math.floor(
                    (Date.now() - new Date(agent.statusChangedAt).getTime()) / 1000
                  );
                  return (
                    <tr
                      key={agent.agentId}
                      className={cn('data-table-row', agent.isSLABreached && 'sla-breach')}
                      style={{ borderBottom: '1px solid var(--border-default)' }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                            style={{ background: 'linear-gradient(135deg, #1D4ED8, #2563EB)' }}>
                            {agent.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-heading)' }}>
                              {agent.name}
                            </p>
                            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{agent.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={agent.role} size="sm" /></td>
                      <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {agent.extension}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={agent.isSLABreached ? 'SLA_BREACH' : agent.currentStatus} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('text-xs font-mono flex items-center gap-1')}
                          style={{ color: agent.isSLABreached ? '#DC2626' : 'var(--text-body)' }}>
                          <Clock className="w-3 h-3" />
                          {formatDuration(durationSecs)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-center" style={{ color: 'var(--text-heading)' }}>
                        {agent.ticketsRegistered}
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {formatDuration(agent.cappedBreakSeconds)}
                        &nbsp;
                        <span style={{ color: 'var(--text-muted)' }}>/ 60m</span>
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {agent.activeBreakType ?? '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
