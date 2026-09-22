'use client';

// ─── app/dashboard/l3/monitor/page.tsx ────────────────────────────────────
// Supervisor Monitoring Console — Industry-Standard Premium UI
// ────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity, PhoneCall, ClipboardList, LogIn,
  RefreshCw, Users, PhoneOff, Coffee, AlertTriangle,
  Search, X, LogOut, Clock, Phone,
  TrendingUp, ShieldOff, CheckCircle2, Inbox, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getMonitorSummary, getHourlyActivity, getLoginLog,
  forceLogoutAgent, getCallLog,
  type MonitorSummary, type LoginLogEntry, type CallLogEntry, type HourlyBucket,
} from '@/app/actions/monitor';
import { getAgentRosterForToday } from '@/app/actions/breaks';

// ── helpers ────────────────────────────────────────────────────────────────

function fmtDur(sec: number) {
  if (!sec || sec < 0) return '00:00:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

function fmtTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function useLiveSec(startIso: string) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const tick = () => setSec(Math.max(0, Math.floor((Date.now() - new Date(startIso).getTime()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startIso]);
  return sec;
}

// ── Status config ──────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { bg: string; border: string; text: string; label: string; dot: string }> = {
  AVAILABLE: { bg: 'rgba(22,163,74,0.08)',  border: 'rgba(22,163,74,0.2)',  text: '#15803D', label: 'Idle',    dot: '#22c55e' },
  ON_CALL:   { bg: 'rgba(37,99,235,0.08)',  border: 'rgba(37,99,235,0.2)',  text: '#1D4ED8', label: 'In Call', dot: '#3b82f6' },
  WRAP_UP:   { bg: 'rgba(124,58,237,0.08)',border: 'rgba(124,58,237,0.2)', text: '#6D28D9', label: 'Wrap Up', dot: '#a855f7' },
  ON_BREAK:  { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', text: '#B45309', label: 'Break',   dot: '#f59e0b' },
  OFFLINE:   { bg: 'rgba(100,116,139,0.06)',border: 'rgba(100,116,139,0.15)',text: '#64748B', label: 'Offline', dot: '#94a3b8' },
  BREACH:    { bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)',  text: '#DC2626', label: 'SLA!',    dot: '#ef4444' },
};

const DISP_LABEL: Record<string, string> = {
  CYBER_FRAUD_COMPLAINT: 'Cyber Fraud',
  BLANK_CALL:            'Blank Call',
  ENQUIRY:               'Enquiry',
  MISDIAL:               'Misdial',
  REPEAT_CALLER:         'Repeat Caller',
};
const DISP_COLOR: Record<string, string> = {
  CYBER_FRAUD_COMPLAINT: '#DC2626',
  BLANK_CALL:            '#64748B',
  ENQUIRY:               '#2563EB',
  MISDIAL:               '#9333EA',
  REPEAT_CALLER:         '#D97706',
};

type Tab = 'home' | 'wallboard' | 'calllog' | 'loginlog';

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function MonitorPage() {
  const [tab, setTab]           = useState<Tab>('home');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing]   = useState(false);

  const [summary,   setSummary]   = useState<MonitorSummary | null>(null);
  const [buckets,   setBuckets]   = useState<HourlyBucket[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [roster,    setRoster]    = useState<any[]>([]);
  const [loginLog,  setLoginLog]  = useState<LoginLogEntry[]>([]);
  const [callLog,   setCallLog]   = useState<CallLogEntry[]>([]);

  const [summaryErr, setSummaryErr] = useState<string | null>(null);
  const [rosterErr,  setRosterErr]  = useState<string | null>(null);
  const [logErr,     setLogErr]     = useState<string | null>(null);
  const [callErr,    setCallErr]    = useState<string | null>(null);

  const [forcingId,  setForcingId]  = useState<string | null>(null);
  const [toast,      setToast]      = useState<{ msg: string; ok: boolean } | null>(null);

  const [filterStart, setFilterStart] = useState(todayStr());
  const [filterEnd,   setFilterEnd]   = useState(todayStr());
  const [filterExt,   setFilterExt]   = useState('');
  const [filterAgent, setFilterAgent] = useState('');
  const [filterDisp,  setFilterDisp]  = useState('');
  const [filterPhone, setFilterPhone] = useState('');
  const [callLoading, setCallLoading] = useState(false);

  const loadAll = useCallback(async () => {
    setRefreshing(true);
    const [s, h, r, ll] = await Promise.all([
      getMonitorSummary(), getHourlyActivity(), getAgentRosterForToday(), getLoginLog(),
    ]);
    if (s.data)    { setSummary(s.data);    setSummaryErr(null); } else setSummaryErr(s.error ?? null);
    if (h.buckets) setBuckets(h.buckets);
    if (r.roster)  { setRoster(r.roster as unknown[]); setRosterErr(null); } else setRosterErr(r.error ?? null);
    if (ll.log)    { setLoginLog(ll.log);   setLogErr(null); }    else setLogErr(ll.error ?? null);
    setLastRefresh(new Date());
    setRefreshing(false);
  }, []);

  const loadCallLog = useCallback(async () => {
    setCallLoading(true);
    const res = await getCallLog({
      startDate: filterStart, endDate: filterEnd,
      extension: filterExt   || undefined,
      agentUsername: filterAgent || undefined,
      disposition: filterDisp  || undefined,
      phone: filterPhone || undefined,
    });
    if (res.calls) { setCallLog(res.calls); setCallErr(null); } else setCallErr(res.error ?? null);
    setCallLoading(false);
  }, [filterStart, filterEnd, filterExt, filterAgent, filterDisp, filterPhone]);

  useEffect(() => { loadAll(); }, [loadAll]);
  useEffect(() => { const id = setInterval(loadAll, 10_000); return () => clearInterval(id); }, [loadAll]);
  useEffect(() => { if (tab === 'calllog') loadCallLog(); }, [tab, loadCallLog]);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const handleForceLogout = async (agentId: string, name: string) => {
    if (!confirm(`Force logout ${name}? Their session will end immediately.`)) return;
    setForcingId(agentId);
    const res = await forceLogoutAgent(agentId);
    setForcingId(null);
    showToast(res.success ? (res.message ?? 'Agent logged out') : (res.error ?? 'Failed'), !!res.success);
    await loadAll();
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'home',      label: 'Home' },
    { key: 'wallboard', label: 'Wall Board' },
    { key: 'calllog',   label: 'Call Logger' },
    { key: 'loginlog',  label: 'Login Log' },
  ];

  return (
    <div className="w-full max-w-full space-y-6 pb-8">

      {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
      <div className="relative flex items-center gap-3">
        {/* Icon */}
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
          style={{
            background: 'linear-gradient(135deg,rgba(37,99,235,0.12),rgba(37,99,235,0.06))',
            border: '1.5px solid rgba(37,99,235,0.2)',
          }}
        >
          <Activity className="w-5 h-5" style={{ color: '#2563EB' }} />
        </div>

        {/* Title + subtitle */}
        <div style={{ paddingRight: '160px' }}>
          <h1
            className="text-lg font-bold"
            style={{ fontFamily: 'var(--font-outfit)', color: 'var(--text-heading)', letterSpacing: '-0.02em', lineHeight: 1.25 }}
          >
            Supervisor Monitoring Console
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block shrink-0" />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Live · auto-refresh 10s · Updated {lastRefresh.toLocaleTimeString('en-IN', { hour12: false })}
            </span>
          </div>
        </div>

        {/* Refresh — absolutely positioned top-right, never overflows */}
        <div className="absolute right-0 top-0">
          <button
            onClick={loadAll}
            disabled={refreshing}
            className="inline-flex items-center gap-2 h-9 px-5 rounded-lg text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg,#1D4ED8,#2563EB)',
              boxShadow: '0 2px 8px rgba(37,99,235,0.28)',
            }}
          >
            <RefreshCw className={cn('w-4 h-4 shrink-0', refreshing && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── TOAST ─────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium"
          style={{
            background: toast.ok ? 'rgba(22,163,74,0.08)' : 'rgba(239,68,68,0.08)',
            border: `1px solid ${toast.ok ? 'rgba(22,163,74,0.22)' : 'rgba(239,68,68,0.22)'}`,
            color: toast.ok ? '#15803D' : '#DC2626',
          }}
        >
          {toast.ok
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {toast.msg}
        </div>
      )}

      {/* ── TAB BAR ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '5px',
          background: '#E8EEF6',
          border: '1.5px solid #B6C4D8',
          borderRadius: '14px',
          boxShadow: '0 1px 4px rgba(15,23,42,0.08)',
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '7px 20px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              border: 'none',
              transition: 'all 0.18s ease',
              outline: 'none',
              ...(tab === t.key
                ? {
                    background: 'linear-gradient(135deg,#1D4ED8,#2563EB)',
                    color: '#FFFFFF',
                    boxShadow: '0 2px 8px rgba(37,99,235,0.32)',
                  }
                : {
                    background: 'transparent',
                    color: '#334155',
                  }),
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ERROR BAR ─────────────────────────────────────────────────── */}
      {(summaryErr || rosterErr || logErr) && (
        <ErrBanner msg={summaryErr ?? rosterErr ?? logErr ?? ''} />
      )}

      {/* ── TAB CONTENT ───────────────────────────────────────────────── */}
      <div>
        {tab === 'home'      && <HomeTab summary={summary} buckets={buckets} roster={roster} />}
        {tab === 'wallboard' && (
          <WallBoardTab roster={roster} err={rosterErr} onForceLogout={handleForceLogout} forcingId={forcingId} />
        )}
        {tab === 'calllog' && (
          <CallLogTab
            calls={callLog} loading={callLoading} error={callErr}
            filterStart={filterStart} filterEnd={filterEnd}
            filterExt={filterExt} filterAgent={filterAgent}
            filterDisp={filterDisp} filterPhone={filterPhone}
            onChangeStart={setFilterStart} onChangeEnd={setFilterEnd}
            onChangeExt={setFilterExt} onChangeAgent={setFilterAgent}
            onChangeDisp={setFilterDisp} onChangePhone={setFilterPhone}
            onSearch={loadCallLog}
          />
        )}
        {tab === 'loginlog' && (
          <LoginLogTab log={loginLog} error={logErr} onForceLogout={handleForceLogout} forcingId={forcingId} />
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HOME TAB
// ═══════════════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function HomeTab({ summary, buckets, roster }: { summary: MonitorSummary | null; buckets: HourlyBucket[]; roster: any[] }) {
  const kpis = [
    { label: 'Total Agents',  value: summary?.total       ?? 0, color: '#2563EB', bg: 'rgba(37,99,235,0.08)',   icon: <Users className="w-5 h-5" /> },
    { label: 'Available',     value: summary?.available   ?? 0, color: '#16A34A', bg: 'rgba(22,163,74,0.08)',   icon: <CheckCircle2 className="w-5 h-5" /> },
    { label: 'On Call',       value: summary?.onCall      ?? 0, color: '#2563EB', bg: 'rgba(37,99,235,0.08)',   icon: <PhoneCall className="w-5 h-5" /> },
    { label: 'Wrap Up',       value: summary?.wrapUp      ?? 0, color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', icon: <TrendingUp className="w-5 h-5" /> },
    { label: 'On Break',      value: summary?.onBreak     ?? 0, color: '#D97706', bg: 'rgba(245,158,11,0.08)', icon: <Coffee className="w-5 h-5" /> },
    { label: 'SLA Breached',  value: summary?.slaBreached ?? 0, color: '#DC2626', bg: 'rgba(239,68,68,0.08)',  icon: <AlertTriangle className="w-5 h-5" /> },
    { label: 'Tickets Today', value: summary?.totalTickets ?? 0, color: '#0891B2', bg: 'rgba(8,145,178,0.08)', icon: <Zap className="w-5 h-5" /> },
    { label: 'Offline',       value: summary?.offline     ?? 0, color: '#64748B', bg: 'rgba(100,116,139,0.07)',icon: <PhoneOff className="w-5 h-5" /> },
  ];

  const donutData = [
    { label: 'Available', value: summary?.available ?? 0, color: '#22c55e' },
    { label: 'In Call',   value: summary?.onCall    ?? 0, color: '#3b82f6' },
    { label: 'Wrap Up',   value: summary?.wrapUp    ?? 0, color: '#a855f7' },
    { label: 'Break',     value: summary?.onBreak   ?? 0, color: '#f59e0b' },
    { label: 'Offline',   value: summary?.offline   ?? 0, color: '#94a3b8' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">

      {/* KPI Grid — 4 per row, 2 rows */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Donut — 2 cols */}
        <div
          className="lg:col-span-2 rounded-2xl p-6"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-xs)' }}
        >
          <ChartLabel>Agent Status Distribution</ChartLabel>
          <div className="flex items-center gap-6 mt-4">
            <DonutChart data={donutData} total={summary?.total ?? 0} />
            <div className="flex-1 space-y-3 min-w-0">
              {donutData.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No agents logged in</p>
              ) : donutData.map((d) => (
                <div key={d.label} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-sm truncate" style={{ color: 'var(--text-body)' }}>{d.label}</span>
                  </div>
                  <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: 'var(--text-heading)' }}>
                    {d.value}
                  </span>
                </div>
              ))}
              <div className="pt-3 border-t" style={{ borderColor: 'var(--border-muted)' }}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Total</span>
                  <span className="text-base font-bold tabular-nums" style={{ color: 'var(--text-heading)' }}>
                    {summary?.total ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Line chart — 3 cols */}
        <div
          className="lg:col-span-3 rounded-2xl p-6"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-xs)' }}
        >
          <ChartLabel>Agents Online by Hour of Day</ChartLabel>
          <div className="mt-4">
            <LineChart buckets={buckets} />
          </div>
        </div>
      </div>

      {/* Live Agent Snapshot */}
      <div
        className="rounded-2xl p-6"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-xs)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <ChartLabel>Live Agent Snapshot</ChartLabel>
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full"
            style={{ background: 'rgba(37,99,235,0.08)', color: '#2563EB', border: '1px solid rgba(37,99,235,0.15)' }}
          >
            {roster.length} agents
          </span>
        </div>
        {roster.length === 0 ? (
          <EmptyState label="No agents logged in today" />
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {roster.map((a) => {
              const key = a.isSLABreached ? 'BREACH' : (a.currentStatus as string);
              const cfg = STATUS_CFG[key] || STATUS_CFG.OFFLINE;
              return (
                <div
                  key={a.agentId}
                  className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm"
                  style={{ background: cfg.bg, borderColor: cfg.border }}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.dot }} />
                  <span className="font-semibold" style={{ color: 'var(--text-heading)' }}>
                    {(a.name as string)?.split(' ')[0]}
                  </span>
                  <span className="font-mono text-xs" style={{ color: 'var(--text-muted)' }}>{a.extension}</span>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-lg"
                    style={{ background: cfg.text + '18', color: cfg.text }}
                  >
                    {cfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── KPI card ────────────────────────────────────────────────────────────────

function KpiCard({ label, value, color, bg, icon }: {
  label: string; value: number; color: string; bg: string; icon: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-xs)' }}
    >
      {/* Icon */}
      <div
        className="flex items-center justify-center w-10 h-10 rounded-xl"
        style={{ background: bg, color }}
      >
        {icon}
      </div>
      {/* Value — large and prominent */}
      <div>
        <p
          className="text-3xl font-bold tabular-nums leading-none"
          style={{ fontFamily: 'var(--font-outfit)', color }}
        >
          {value}
        </p>
        <p
          className="text-xs font-semibold uppercase tracking-widest mt-2"
          style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}
        >
          {label}
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// WALL BOARD
// ═══════════════════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function WallBoardTab({ roster, err, onForceLogout, forcingId }: { roster: any[]; err: string | null; onForceLogout: (id: string, name: string) => void; forcingId: string | null }) {
  if (err) return <ErrBanner msg={err} />;

  const counts = {
    total:   roster.length,
    idle:    roster.filter((a) => a.currentStatus === 'AVAILABLE').length,
    incall:  roster.filter((a) => a.currentStatus === 'ON_CALL').length,
    wrapup:  roster.filter((a) => a.currentStatus === 'WRAP_UP').length,
    onBreak: roster.filter((a) => a.currentStatus === 'ON_BREAK').length,
    breach:  roster.filter((a) => a.isSLABreached).length,
  };

  const pills = [
    { label: 'Total',      value: counts.total,   color: '#2563EB' },
    { label: 'Idle',       value: counts.idle,    color: '#16A34A' },
    { label: 'In Call',    value: counts.incall,  color: '#2563EB' },
    { label: 'Wrap Up',    value: counts.wrapup,  color: '#7C3AED' },
    { label: 'On Break',   value: counts.onBreak, color: '#D97706' },
    { label: 'SLA Breach', value: counts.breach,  color: '#DC2626' },
  ];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg,#92400E,#B45309,#D97706)' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/20">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold text-white">Analyst Monitoring — Wall Board</span>
        </div>
        <span className="text-xs text-white/70">Auto-refreshes every 10s</span>
      </div>

      {/* Status pills */}
      <div
        className="flex flex-wrap items-center gap-3 px-6 py-4"
        style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-default)' }}
      >
        {pills.map((p) => (
          <div
            key={p.label}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: p.color + '12', color: p.color, border: `1px solid ${p.color}22` }}
          >
            <span className="text-xl font-bold tabular-nums leading-none">{p.value}</span>
            <span className="text-xs opacity-80">{p.label}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto" style={{ background: 'var(--bg-surface)' }}>
        <table className="w-full border-collapse min-w-[860px]">
          <thead>
            <tr style={{ background: 'var(--bg-table-header)', borderBottom: '2px solid var(--border-card)' }}>
              {['Agent', 'Role', 'Extension', 'Status', 'In Status', 'Tickets', 'Break Used', 'Break Type', 'Action'].map((h) => (
                <th
                  key={h}
                  className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-widest whitespace-nowrap"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {roster.length === 0 ? (
              <tr><td colSpan={9}><EmptyState label="No agents logged in today" /></td></tr>
            ) : roster.map((agent, idx) => {
              const key = agent.isSLABreached ? 'BREACH' : (agent.currentStatus as string);
              const cfg = STATUS_CFG[key] || STATUS_CFG.OFFLINE;
              const isForcingThis = forcingId === agent.agentId;
              const isOffline = agent.currentStatus === 'OFFLINE';
              return (
                <tr
                  key={agent.agentId}
                  className="border-b transition-colors"
                  style={{
                    borderColor: 'var(--border-muted)',
                    background: agent.isSLABreached
                      ? 'rgba(239,68,68,0.03)'
                      : idx % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-elevated)',
                  }}
                >
                  {/* Agent */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: 'linear-gradient(135deg,#1D4ED8,#2563EB)' }}
                      >
                        {(agent.name as string)?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate max-w-[130px]" style={{ color: 'var(--text-heading)' }}>
                          {agent.name}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{agent.username}</p>
                      </div>
                    </div>
                  </td>
                  {/* Role */}
                  <td className="px-5 py-3.5">
                    <span
                      className="inline-flex text-xs font-bold px-2.5 py-1 rounded-lg"
                      style={{ background: 'rgba(37,99,235,0.08)', color: '#1D4ED8' }}
                    >
                      {agent.role}
                    </span>
                  </td>
                  {/* Extension */}
                  <td className="px-5 py-3.5 font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {agent.extension}
                  </td>
                  {/* Status */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.dot }} />
                      <span
                        className="text-xs font-bold px-2.5 py-1 rounded-lg whitespace-nowrap"
                        style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
                      >
                        {cfg.label}
                      </span>
                    </div>
                  </td>
                  {/* Duration */}
                  <td className="px-5 py-3.5">
                    <AgentDurationCell statusChangedAt={agent.statusChangedAt} />
                  </td>
                  {/* Tickets */}
                  <td className="px-5 py-3.5 text-center">
                    <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-heading)' }}>
                      {agent.ticketsRegistered}
                    </span>
                  </td>
                  {/* Break used */}
                  <td className="px-5 py-3.5">
                    <span className="text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                      <span className="font-semibold">{fmtDur(agent.cappedBreakSeconds)}</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}> / 01:00:00</span>
                    </span>
                  </td>
                  {/* Break type */}
                  <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {agent.activeBreakType ?? <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  {/* Force logout */}
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => onForceLogout(agent.agentId, agent.name)}
                      disabled={isForcingThis || isOffline}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
                      style={{
                        background: isOffline ? 'transparent' : 'rgba(239,68,68,0.07)',
                        color: isOffline ? 'var(--text-muted)' : '#DC2626',
                        border: `1px solid ${isOffline ? 'var(--border-muted)' : 'rgba(239,68,68,0.2)'}`,
                        cursor: isOffline ? 'not-allowed' : 'pointer',
                        opacity: isOffline ? 0.4 : 1,
                      }}
                    >
                      {isForcingThis ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldOff className="w-3.5 h-3.5" />}
                      {isForcingThis ? 'Working…' : 'Force Out'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AgentDurationCell({ statusChangedAt }: { statusChangedAt: string }) {
  const sec = useLiveSec(statusChangedAt);
  return (
    <span className="font-mono text-sm tabular-nums flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
      <Clock className="w-3.5 h-3.5 opacity-50 shrink-0" />
      {fmtDur(sec)}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CALL LOGGER
// ═══════════════════════════════════════════════════════════════════════════

const DISPOSITIONS = ['', 'CYBER_FRAUD_COMPLAINT', 'BLANK_CALL', 'ENQUIRY', 'MISDIAL', 'REPEAT_CALLER'];

function CallLogTab({
  calls, loading, error,
  filterStart, filterEnd, filterExt, filterAgent, filterDisp, filterPhone,
  onChangeStart, onChangeEnd, onChangeExt, onChangeAgent, onChangeDisp, onChangePhone,
  onSearch,
}: {
  calls: CallLogEntry[];
  loading: boolean;
  error: string | null;
  filterStart: string; filterEnd: string; filterExt: string;
  filterAgent: string; filterDisp: string; filterPhone: string;
  onChangeStart: (v: string) => void; onChangeEnd: (v: string) => void;
  onChangeExt: (v: string) => void; onChangeAgent: (v: string) => void;
  onChangeDisp: (v: string) => void; onChangePhone: (v: string) => void;
  onSearch: () => void;
}) {
  return (
    <div className="space-y-5">
      {/* Filter card */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-xs)' }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg,#92400E,#B45309,#D97706)' }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/20">
              <ClipboardList className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold text-white">Call Logger — Search &amp; Filter</span>
          </div>
          <span className="text-xs font-medium text-white/70 tabular-nums">{calls.length} records</span>
        </div>

        {/* Filter form */}
        <div className="p-6" style={{ background: 'var(--bg-surface)' }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { label: 'Start Date', el: <input type="date" value={filterStart} onChange={(e) => onChangeStart(e.target.value)} className="crm-input" /> },
              { label: 'End Date',   el: <input type="date" value={filterEnd}   onChange={(e) => onChangeEnd(e.target.value)}   className="crm-input" /> },
              { label: 'Extension', el: <input type="text" value={filterExt}    onChange={(e) => onChangeExt(e.target.value)}    className="crm-input" placeholder="e.g. 6046" /> },
              { label: 'Agent Username', el: <input type="text" value={filterAgent} onChange={(e) => onChangeAgent(e.target.value)} className="crm-input" placeholder="e.g. analyst.priya" /> },
              { label: 'Phone Number',   el: <input type="text" value={filterPhone} onChange={(e) => onChangePhone(e.target.value)} className="crm-input" placeholder="Victim contact number" /> },
              { label: 'Disposition', el: (
                <select value={filterDisp} onChange={(e) => onChangeDisp(e.target.value)} className="crm-input">
                  {DISPOSITIONS.map((d) => (
                    <option key={d} value={d}>{d ? (DISP_LABEL[d] ?? d) : 'All Dispositions'}</option>
                  ))}
                </select>
              )},
            ].map(({ label, el }) => (
              <div key={label}>
                <label
                  className="block text-xs font-bold uppercase tracking-widest mb-2"
                  style={{ color: 'var(--text-muted)', letterSpacing: '0.07em' }}
                >
                  {label}
                </label>
                {el}
              </div>
            ))}
          </div>

          {/* Action row */}
          <div className="flex items-center gap-3 mt-6 pt-5" style={{ borderTop: '1px solid var(--border-muted)' }}>
            <button
              onClick={onSearch}
              disabled={loading}
              className="inline-flex items-center gap-2.5 h-10 px-6 rounded-xl text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#92400E,#B45309)', boxShadow: '0 2px 10px rgba(180,83,9,0.3)' }}
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin shrink-0" /> : <Search className="w-4 h-4 shrink-0" />}
              Search Records
            </button>
            <button
              onClick={() => { onChangeStart(todayStr()); onChangeEnd(todayStr()); onChangeExt(''); onChangeAgent(''); onChangeDisp(''); onChangePhone(''); }}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-medium transition-all"
              style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)', background: 'var(--bg-elevated)' }}
            >
              <X className="w-4 h-4 shrink-0" />
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {error && <ErrBanner msg={error} />}
      {!error && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-xs)' }}
        >
          <div className="overflow-x-auto" style={{ background: 'var(--bg-surface)' }}>
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr style={{ background: 'var(--bg-table-header)', borderBottom: '2px solid var(--border-card)' }}>
                  {['Complaint ID', 'Date / Time', 'Agent', 'Extension', 'Phone', 'Disposition', 'Status', 'Fraud Amt', 'Golden Hr'].map((h) => (
                    <th key={h} className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-widest whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={9} className="py-16 text-center">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto" style={{ color: 'var(--text-muted)' }} />
                  </td></tr>
                )}
                {!loading && calls.length === 0 && (
                  <tr><td colSpan={9}><EmptyState label="No records found. Apply filters and click Search." /></td></tr>
                )}
                {!loading && calls.map((call, idx) => {
                  const dc = DISP_COLOR[call.disposition ?? ''] || 'var(--text-muted)';
                  return (
                    <tr key={call.id} className="border-b transition-colors"
                      style={{ borderColor: 'var(--border-muted)', background: idx % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-elevated)' }}>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-sm font-bold" style={{ color: '#2563EB' }}>{call.complaintId}</span>
                      </td>
                      <td className="px-5 py-3.5 text-sm whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                        {fmtDate(call.callDate)}
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>{call.agentName}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{call.agentUsername}</p>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>{call.extension}</td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-sm flex items-center gap-1" style={{ color: 'var(--text-body)' }}>
                          <Phone className="w-3.5 h-3.5 opacity-50 shrink-0" />{call.phoneNumber || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {call.disposition ? (
                          <span className="inline-flex text-xs font-semibold px-2.5 py-1 rounded-lg whitespace-nowrap"
                            style={{ background: dc + '18', color: dc }}>
                            {DISP_LABEL[call.disposition] ?? call.disposition}
                          </span>
                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-sm" style={{ color: 'var(--text-secondary)' }}>{call.status}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-semibold tabular-nums"
                          style={{ color: call.fraudAmount > 0 ? '#DC2626' : 'var(--text-muted)' }}>
                          {call.fraudAmount > 0 ? `₹${call.fraudAmount.toLocaleString('en-IN')}` : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        {call.isGoldenHour
                          ? <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', color: '#DC2626' }}>⚡ YES</span>
                          : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LOGIN LOG
// ═══════════════════════════════════════════════════════════════════════════

function LoginLogTab({ log, error, onForceLogout, forcingId }: {
  log: LoginLogEntry[];
  error: string | null;
  onForceLogout: (id: string, name: string) => void;
  forcingId: string | null;
}) {
  if (error) return <ErrBanner msg={error} />;

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Header */}
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg,#1E3A8A,#1D4ED8,#2563EB)' }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/20">
            <LogIn className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold text-white">Agent Login / Logout Log — Today</span>
        </div>
        <span className="text-xs font-medium text-white/70 tabular-nums">{log.length} sessions</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto" style={{ background: 'var(--bg-surface)' }}>
        <table className="w-full border-collapse min-w-[900px]">
          <thead>
            <tr style={{ background: 'var(--bg-table-header)', borderBottom: '2px solid var(--border-card)' }}>
              {['Agent', 'Role', 'Extension', 'Login Time', 'Logout Time', 'Duration', 'Status', 'Tickets', 'Breaks', 'Action'].map((h) => (
                <th key={h} className="text-left px-5 py-3.5 text-xs font-bold uppercase tracking-widest whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {log.length === 0 && (
              <tr><td colSpan={10}><EmptyState label="No sessions recorded today" /></td></tr>
            )}
            {log.map((entry, idx) => {
              const cfg = STATUS_CFG[entry.currentStatus] || STATUS_CFG.OFFLINE;
              const isForcingThis = forcingId === entry.agentId;
              return (
                <tr
                  key={entry.agentId}
                  className="border-b transition-colors"
                  style={{
                    borderColor: 'var(--border-muted)',
                    background: idx % 2 === 0 ? 'var(--bg-surface)' : 'var(--bg-elevated)',
                  }}
                >
                  {/* Agent */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: 'linear-gradient(135deg,#1D4ED8,#2563EB)' }}
                      >
                        {entry.name?.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate max-w-[130px]" style={{ color: 'var(--text-heading)' }}>
                          {entry.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{entry.username}</p>
                      </div>
                    </div>
                  </td>
                  {/* Role */}
                  <td className="px-5 py-3.5">
                    <span className="inline-flex text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: 'rgba(37,99,235,0.08)', color: '#1D4ED8' }}>
                      {entry.role}
                    </span>
                  </td>
                  {/* Ext */}
                  <td className="px-5 py-3.5 font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>{entry.extension}</td>
                  {/* Login */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5 text-sm whitespace-nowrap" style={{ color: 'var(--text-body)' }}>
                      <LogIn className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      {fmtTime(entry.loginTime)}
                    </div>
                  </td>
                  {/* Logout */}
                  <td className="px-5 py-3.5">
                    {entry.logoutTime
                      ? <div className="flex items-center gap-1.5 text-sm whitespace-nowrap" style={{ color: 'var(--text-body)' }}>
                          <LogOut className="w-3.5 h-3.5 text-red-500 shrink-0" />
                          {fmtTime(entry.logoutTime)}
                        </div>
                      : <span className="text-sm font-semibold text-emerald-600">● Active</span>}
                  </td>
                  {/* Duration */}
                  <td className="px-5 py-3.5 font-mono text-sm tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                    {fmtDur(entry.durationSec)}
                  </td>
                  {/* Status */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.dot }} />
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg whitespace-nowrap"
                        style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}>
                        {cfg.label}
                      </span>
                    </div>
                  </td>
                  {/* Tickets */}
                  <td className="px-5 py-3.5 text-center">
                    <span className="text-sm font-bold tabular-nums" style={{ color: 'var(--text-heading)' }}>
                      {entry.ticketsRegistered}
                    </span>
                  </td>
                  {/* Breaks */}
                  <td className="px-5 py-3.5 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                    {entry.breakCount}
                  </td>
                  {/* Force logout */}
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => onForceLogout(entry.agentId, entry.name)}
                      disabled={isForcingThis || !entry.isOnline}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap"
                      style={{
                        background: !entry.isOnline ? 'transparent' : 'rgba(239,68,68,0.07)',
                        color: !entry.isOnline ? 'var(--text-muted)' : '#DC2626',
                        border: `1px solid ${!entry.isOnline ? 'var(--border-muted)' : 'rgba(239,68,68,0.2)'}`,
                        cursor: !entry.isOnline ? 'not-allowed' : 'pointer',
                        opacity: !entry.isOnline ? 0.4 : 1,
                      }}
                    >
                      {isForcingThis ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ShieldOff className="w-3.5 h-3.5" />}
                      {isForcingThis ? '…' : 'Force Out'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CANVAS CHARTS
// ═══════════════════════════════════════════════════════════════════════════

function DonutChart({ data, total }: { data: { label: string; value: number; color: string }[]; total: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const size = 160;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width  = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2, cy = size / 2;
    const outerR = size / 2 - 8;
    const innerR = outerR * 0.6;
    const sum = data.reduce((a, d) => a + d.value, 0);

    if (sum === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(148,163,184,0.15)';
      ctx.lineWidth = outerR - innerR;
      ctx.stroke();
    } else {
      let angle = -Math.PI / 2;
      for (const d of data) {
        const sweep = (d.value / sum) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, outerR, angle, angle + sweep);
        ctx.closePath();
        ctx.fillStyle = d.color;
        ctx.fill();
        angle += sweep;
      }
      ctx.beginPath();
      ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg-surface').trim() || '#fff';
      ctx.fillStyle = bg;
      ctx.fill();
    }

    // Center text
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    const headingColor = getComputedStyle(document.documentElement).getPropertyValue('--text-heading').trim() || '#0f172a';
    ctx.fillStyle = headingColor;
    ctx.font = `bold ${Math.round(size * 0.16)}px Outfit, sans-serif`;
    ctx.fillText(String(total), cx, cy - 9);
    ctx.font = `${Math.round(size * 0.078)}px Inter, sans-serif`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('total', cx, cy + 12);
  }, [data, total]);

  return <canvas ref={canvasRef} style={{ flexShrink: 0 }} />;
}

function LineChart({ buckets }: { buckets: HourlyBucket[] }) {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas    = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const W   = container.clientWidth || 440;
    const H   = 220;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    const pad = { top: 24, right: 24, bottom: 40, left: 44 };
    const cW  = W - pad.left - pad.right;
    const cH  = H - pad.top  - pad.bottom;

    // Filter out buckets with count=0 unless there's only 1 bucket
    const visible = buckets.length > 2 ? buckets.filter((b) => b.count > 0 || buckets.some((x) => x.count > 0)) : buckets;
    if (visible.length === 0) {
      ctx.fillStyle    = '#94a3b8';
      ctx.font         = '13px Inter, sans-serif';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No activity data yet for today', W / 2, H / 2);
      return;
    }

    const maxVal = Math.max(...visible.map((b) => b.count), 1);
    const step   = Math.max(1, Math.ceil(maxVal / 4));

    // Y-axis grid + labels
    for (let v = 0; v <= maxVal; v += step) {
      const y = pad.top + cH - (v / maxVal) * cH;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(148,163,184,0.12)';
      ctx.lineWidth   = 1;
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + cW, y);
      ctx.stroke();
      ctx.fillStyle    = '#94a3b8';
      ctx.font         = '11px Inter, sans-serif';
      ctx.textAlign    = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(v), pad.left - 8, y);
    }

    const xStep = visible.length > 1 ? cW / (visible.length - 1) : cW / 2;
    const pts   = visible.map((b, i) => ({
      x: pad.left + i * xStep,
      y: pad.top + cH - (b.count / maxVal) * cH,
      b,
    }));

    // Gradient fill under line
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + cH);
    grad.addColorStop(0, 'rgba(37,99,235,0.18)');
    grad.addColorStop(1, 'rgba(37,99,235,0.01)');
    ctx.beginPath();
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.lineTo(pts[pts.length - 1].x, pad.top + cH);
    ctx.lineTo(pts[0].x, pad.top + cH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth   = 2.5;
    ctx.lineJoin    = 'round';
    ctx.lineCap     = 'round';
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();

    // Dots + labels
    const labelEvery = Math.max(1, Math.floor(visible.length / 8));
    pts.forEach((p, i) => {
      // Dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle   = '#fff';
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth   = 2;
      ctx.fill();
      ctx.stroke();

      // Hour label (X-axis)
      if (i % labelEvery === 0 || i === pts.length - 1) {
        ctx.fillStyle    = '#94a3b8';
        ctx.font         = '10px Inter, sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`${String(p.b.hour).padStart(2, '0')}:00`, p.x, pad.top + cH + 8);
      }

      // Value above dot
      if (p.b.count > 0) {
        ctx.fillStyle    = '#1D4ED8';
        ctx.font         = 'bold 10px Inter, sans-serif';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(String(p.b.count), p.x, p.y - 7);
      }
    });
  }, [buckets]);

  return (
    <div ref={containerRef} className="w-full">
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%' }} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED UI PRIMITIVES
// ═══════════════════════════════════════════════════════════════════════════

function ChartLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
      {children}
    </p>
  );
}

function ErrBanner({ msg }: { msg: string }) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3.5 rounded-xl text-sm"
      style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', color: '#DC2626' }}
    >
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{msg}</span>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-20 text-center">
      <Inbox className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
      <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  );
}


