'use client';

// ─── app/dashboard/page.tsx ────────────────────────────────────────────────
// Role-based dashboard with LIVE KPI data fetched from the backend.
// Each role fetches its own relevant metrics on mount.
// ───────────────────────────────────────────────────────────────────────────

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  PhoneIncoming, FileText, Activity,
  Search, Zap, Scale, BarChart3, Users,
  ArrowRight, RefreshCw,
} from 'lucide-react';
import apiClient from '@/lib/api-client';
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
  Tooltip, XAxis, YAxis, CartesianGrid,
} from 'recharts';

export default function DashboardHomePage() {
  const { user } = useAuth();

  if (!user) return null;

  if (user.role === 'L1') return <L1Dashboard userName={user.name} />;
  if (user.role === 'L2') return <L2Dashboard />;
  if (user.role === 'L3') return <L3Dashboard />;

  return null;
}

/* ─── Shared sub-components ─── */

function Metric({
  label, value, note, color = 'default', loading = false,
}: {
  label: string; value: string; note?: string;
  color?: 'default' | 'green' | 'amber' | 'red' | 'violet' | 'blue';
  loading?: boolean;
}) {
  const valueColorMap = {
    default: 'var(--text-heading)', green: '#16A34A', amber: '#D97706',
    red: '#DC2626', violet: '#7C3AED', blue: '#2563EB',
  };
  const accentMap = {
    default: 'rgba(37,99,235,0.5)', green: 'rgba(22,163,74,0.5)',
    amber: '#F59E0B', red: '#EF4444', violet: '#7C3AED', blue: '#2563EB',
  };
  return (
    <div className="stat-card" style={{ borderTopColor: accentMap[color] }}>
      <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {loading ? (
        <div className="h-8 w-24 rounded animate-pulse" style={{ background: 'var(--bg-elevated)' }} />
      ) : (
        <p className="text-2xl font-bold font-outfit" style={{ color: valueColorMap[color] }}>{value}</p>
      )}
      {note && <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{note}</p>}
    </div>
  );
}

function QuickAction({ href, icon, label, description }: {
  href: string; icon: React.ReactNode; label: string; description: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-3 p-3.5 rounded-lg border transition-all group cursor-pointer hover:border-blue-200 hover:bg-blue-50"
      style={{ borderColor: 'var(--border-default)', background: 'var(--bg-surface)' }}>
      <div className="flex items-center justify-center w-9 h-9 rounded-lg border shrink-0"
        style={{ background: 'rgba(37,99,235,0.06)', borderColor: 'rgba(37,99,235,0.15)', color: '#2563EB' }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>{label}</p>
        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
    </Link>
  );
}

function Step({ n, text }: { n: number; text: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white shrink-0 mt-0.5"
        style={{ background: '#2563EB', minWidth: '24px' }}>{n}</span>
      <p className="text-sm" style={{ color: 'var(--text-body)' }}>{text}</p>
    </div>
  );
}

function SectionCard({ title, children, action }: {
  title: string; children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="form-section">
      <div className="flex items-center justify-between mb-4 pb-3 border-b" style={{ borderColor: 'var(--border-default)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function RefreshButton({ onClick, loading }: { onClick: () => void; loading: boolean }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border transition-colors"
      style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)', background: 'var(--bg-surface)' }}>
      <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Refreshing...' : 'Refresh'}
    </button>
  );
}

// ─── PIE CHART COLOURS ───────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  L1_REGISTERED:       '#2563EB',
  L2_PENDING:          '#F59E0B',
  REGISTERED_IN_NCCRP: '#16A34A',
  LIEN_CONFIRMED:      '#7C3AED',
  DRAFT:               '#94A3B8',
};

/* ═══════════════════════════════════════════════════════════════════════════
   L1 DASHBOARD
═══════════════════════════════════════════════════════════════════════════ */
function L1Dashboard({ userName }: { userName: string }) {
  const [metrics, setMetrics] = useState({
    ticketsToday: 0,
    fraudTotal: 0,
    loading: true,
  });

  const fetchMetrics = useCallback(async () => {
    setMetrics((m) => ({ ...m, loading: true }));
    try {
      // My tickets for today
      const { tickets } = await apiClient.get<{ tickets: { createdAt: string; totalFraudAmount?: number }[] }>('/api/tickets/my');
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const todayTickets = tickets.filter((t) => new Date(t.createdAt) >= today);
      const fraudTotal = todayTickets.reduce((s, t) => s + (t.totalFraudAmount || 0), 0);
      setMetrics({ ticketsToday: todayTickets.length, fraudTotal, loading: false });
    } catch {
      setMetrics((m) => ({ ...m, loading: false }));
    }
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Good {getGreeting()}, {userName.split(' ')[0]}</h1>
          <p className="page-subtitle">L1 Analyst · Intake Operations</p>
        </div>
        <RefreshButton onClick={fetchMetrics} loading={metrics.loading} />
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Metric label="My Tickets Today" value={String(metrics.ticketsToday)} note="Registered by you" color="green" loading={metrics.loading} />
        <Metric label="Fraud Reported" value={`₹ ${formatAmount(metrics.fraudTotal)}`} note="Today's total" color="amber" loading={metrics.loading} />
        <Metric label="Total This Week" value="—" note="Check My Tickets" />
        <Metric label="Status" value="Active" note="Shift in progress" color="blue" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SectionCard title="Quick Actions">
          <div className="space-y-2.5">
            <QuickAction href="/dashboard/l1/new-complaint" icon={<PhoneIncoming className="w-4 h-4" />} label="New Complaint" description="Register a cybercrime complaint" />
            <QuickAction href="/dashboard/l1/my-tickets" icon={<FileText className="w-4 h-4" />} label="My Tickets" description="View your registered complaints" />
            <QuickAction href="/dashboard/track-complaint" icon={<Search className="w-4 h-4" />} label="Track Complaint" description="Search by mobile, ID or status" />
          </div>
        </SectionCard>
        <SectionCard title="Getting Started">
          <div className="divide-y" style={{ borderColor: 'var(--border-muted)' }}>
            <Step n={1} text={<>Click <strong style={{ color: 'var(--text-heading)' }}>Available</strong> in the top bar to start receiving calls</>} />
            <Step n={2} text={<>Simulate or accept an incoming call to begin intake</>} />
            <Step n={3} text={<>Fill the complaint form and submit — a unique complaint ID is generated</>} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   L2 DASHBOARD
═══════════════════════════════════════════════════════════════════════════ */
interface ReportData {
  goldenHourCases: number;
  totalTicketsPeriod: number;
  totalFraudPeriod: number;
  totalLienPeriod: number;
  overallRecovery: string;
  statusBreakdown: { _id: string; count: number }[];
}

function L2Dashboard() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ data: ReportData }>('/api/reports/data');
      setData(res.data);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const pendingLien = data?.statusBreakdown?.find((s) => s._id === 'L2_PENDING')?.count ?? 0;
  const nccrpFiled  = data?.statusBreakdown?.find((s) => s._id === 'REGISTERED_IN_NCCRP')?.count ?? 0;

  const pieData = (data?.statusBreakdown ?? []).map((s) => ({
    name: s._id.replace(/_/g, ' '),
    value: s.count,
    fill: STATUS_COLORS[s._id] ?? '#94A3B8',
  }));

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Investigation Dashboard</h1>
          <p className="page-subtitle">L2 Officer · Lien &amp; NCCRP Operations</p>
        </div>
        <RefreshButton onClick={fetchData} loading={loading} />
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Metric label="Golden Hour Cases" value={String(data?.goldenHourCases ?? 0)} note="Today" color="red" loading={loading} />
        <Metric label="Pending Lien" value={String(pendingLien)} note="Awaiting processing" color="amber" loading={loading} />
        <Metric label="NCCRP Filed" value={String(nccrpFiled)} note="Today" color="green" loading={loading} />
        <Metric label="Recovery Rate" value={data ? `${data.overallRecovery}%` : '—'} note="Lien / Fraud" color="violet" loading={loading} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SectionCard title="Quick Actions">
          <div className="space-y-2.5">
            <QuickAction href="/dashboard/l2/alerts" icon={<Zap className="w-4 h-4" />} label="Golden Hour Alerts" description="Real-time SSE feed — cases within 3 hours" />
            <QuickAction href="/dashboard/l2/pending-lien" icon={<Scale className="w-4 h-4" />} label="Pending Lien" description="T+1 queue — process lien and NCCRP" />
            <QuickAction href="/dashboard/l2/tickets" icon={<FileText className="w-4 h-4" />} label="All Tickets" description="View and manage all complaints" />
          </div>
        </SectionCard>

        <SectionCard title="Ticket Status Breakdown">
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <span className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: unknown) => [v as number, 'tickets']} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No tickets today</p>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Today's Financials">
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)' }}>
            <p className="text-[11px] font-medium uppercase tracking-wider mb-1" style={{ color: '#DC2626' }}>Total Fraud</p>
            <p className="text-xl font-bold font-outfit" style={{ color: '#DC2626' }}>
              {loading ? '—' : `₹ ${formatAmount(data?.totalFraudPeriod ?? 0)}`}
            </p>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.15)' }}>
            <p className="text-[11px] font-medium uppercase tracking-wider mb-1" style={{ color: '#7C3AED' }}>Total Lien</p>
            <p className="text-xl font-bold font-outfit" style={{ color: '#7C3AED' }}>
              {loading ? '—' : `₹ ${formatAmount(data?.totalLienPeriod ?? 0)}`}
            </p>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: 'rgba(22,163,74,0.05)', border: '1px solid rgba(22,163,74,0.15)' }}>
            <p className="text-[11px] font-medium uppercase tracking-wider mb-1" style={{ color: '#16A34A' }}>Recovery</p>
            <p className="text-xl font-bold font-outfit" style={{ color: '#16A34A' }}>
              {loading ? '—' : `${data?.overallRecovery ?? 0}%`}
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   L3 DASHBOARD
═══════════════════════════════════════════════════════════════════════════ */
interface MonitorSummary {
  total: number;
  available: number;
  onCall: number;
  onBreak: number;
  wrapUp: number;
  offline: number;
  slaBreached: number;
  totalTickets: number;
  totalTalkSec: number;
}

interface HourlyBucket { hour: number; count: number; }

function L3Dashboard() {
  const [monitor, setMonitor] = useState<MonitorSummary | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [hourly, setHourly] = useState<HourlyBucket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [monRes, repRes, hourRes] = await Promise.all([
        apiClient.get<MonitorSummary>('/api/agents/monitor/summary'),
        apiClient.get<{ data: ReportData }>('/api/reports/data'),
        apiClient.get<{ buckets: HourlyBucket[] }>('/api/agents/monitor/hourly-activity'),
      ]);
      setMonitor(monRes);
      setReportData(repRes.data);
      setHourly(hourRes.buckets);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchAll, 30_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const agentStatusData = monitor ? [
    { name: 'Available', value: monitor.available, fill: '#16A34A' },
    { name: 'On Call',   value: monitor.onCall,    fill: '#2563EB' },
    { name: 'Wrap Up',   value: monitor.wrapUp,    fill: '#F59E0B' },
    { name: 'On Break',  value: monitor.onBreak,   fill: '#D97706' },
    { name: 'Offline',   value: monitor.offline,   fill: '#94A3B8' },
  ].filter((d) => d.value > 0) : [];

  const talkHours = monitor ? (monitor.totalTalkSec / 3600).toFixed(1) : '—';

  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Operations Dashboard</h1>
          <p className="page-subtitle">L3 Supervisor · Floor Management &amp; Administration</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Auto-refreshes every 30s</span>
          <RefreshButton onClick={fetchAll} loading={loading} />
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Metric label="Active Agents" value={monitor ? String(monitor.total - monitor.offline) : '—'} note="Online now" color="green" loading={loading} />
        <Metric label="On Break / SLA ⚠️" value={monitor ? `${monitor.onBreak} / ${monitor.slaBreached}` : '—'} note="Breached shown after /" color="amber" loading={loading} />
        <Metric label="Tickets Today" value={String(reportData?.totalTicketsPeriod ?? '—')} note="All agents" loading={loading} />
        <Metric label="Fraud Registered" value={reportData ? `₹ ${formatAmount(reportData.totalFraudPeriod)}` : '—'} note="Today total" color="red" loading={loading} />
      </div>

      {/* Second KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Metric label="Total Talk Time" value={`${talkHours}h`} note="All agents combined" color="blue" loading={loading} />
        <Metric label="Recovery Rate" value={reportData ? `${reportData.overallRecovery}%` : '—'} note="Lien / Fraud" color="violet" loading={loading} />
        <Metric label="On Call" value={String(monitor?.onCall ?? '—')} note="Currently handling calls" loading={loading} />
        <Metric label="Golden Hour" value={String(reportData?.goldenHourCases ?? '—')} note="Cases today" color="red" loading={loading} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Hourly activity chart */}
        <SectionCard title="Hourly Agent Activity">
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <span className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : hourly.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={hourly} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 8 }}
                  formatter={(v: unknown) => [v as number, 'agents active']}
                  labelFormatter={(h) => `${h}:00`}
                />
                <Bar dataKey="count" fill="#2563EB" radius={[3, 3, 0, 0]} name="Agents Active" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No activity data yet</p>
          )}
        </SectionCard>

        {/* Agent status pie */}
        <SectionCard title="Live Agent Status Distribution">
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <span className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : agentStatusData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={180}>
                <PieChart>
                  <Pie data={agentStatusData} cx="50%" cy="50%" outerRadius={70} dataKey="value" innerRadius={35}>
                    {agentStatusData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: unknown) => [v as number, 'agents']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {agentStatusData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.fill }} />
                      <span style={{ color: 'var(--text-body)' }}>{d.name}</span>
                    </div>
                    <span className="font-semibold" style={{ color: 'var(--text-heading)' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-center py-8" style={{ color: 'var(--text-muted)' }}>No agents logged in</p>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SectionCard title="Quick Actions">
          <div className="space-y-2.5">
            <QuickAction href="/dashboard/l3/monitor" icon={<Activity className="w-4 h-4" />} label="Monitoring Console" description="Live call flow, breaks, login/logout audit" />
            <QuickAction href="/dashboard/l3/roster" icon={<Activity className="w-4 h-4" />} label="Live Roster" description="Monitor all agents in real-time" />
            <QuickAction href="/dashboard/l3/reports" icon={<BarChart3 className="w-4 h-4" />} label="Reports &amp; Analytics" description="KPIs, APR, export CSV" />
            <QuickAction href="/dashboard/l3/users" icon={<Users className="w-4 h-4" />} label="User Management" description="Create and manage agent accounts" />
          </div>
        </SectionCard>
        <SectionCard title="Operations Notes">
          <div className="divide-y" style={{ borderColor: 'var(--border-muted)' }}>
            <Step n={1} text={<>Use <strong style={{ color: 'var(--text-heading)' }}>Live Roster</strong> (auto-refreshes every 10s) to monitor agents and SLA breaches</>} />
            <Step n={2} text={<>Red-highlighted rows in the roster indicate SLA breach — agent has exceeded break limit</>} />
            <Step n={3} text={<>Export date-range reports via <strong style={{ color: 'var(--text-heading)' }}>Reports → Export CSV</strong></>} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

/* ─── Utilities ─── */

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

function formatAmount(n: number): string {
  if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000)    return `${(n / 1_00_000).toFixed(2)} L`;
  if (n >= 1_000)       return `${(n / 1_000).toFixed(1)} K`;
  return n.toLocaleString('en-IN', { minimumFractionDigits: 0 });
}
