'use client';

// ─── app/dashboard/page.tsx ────────────────────────────────────────────────
// Converted from Server Component (auth()) to Client Component.
// Role-based dashboard is rendered based on useAuth().user.role.
// ───────────────────────────────────────────────────────────────────────────

import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import {
  PhoneIncoming, FileText, Activity,
  Search, Zap, Scale, BarChart3, Users,
  ArrowRight,
} from 'lucide-react';

export default function DashboardHomePage() {
  const { user } = useAuth();

  if (!user) return null; // layout handles the redirect

  if (user.role === 'L1') return <L1Dashboard userName={user.name} />;
  if (user.role === 'L2') return <L2Dashboard />;
  if (user.role === 'L3') return <L3Dashboard />;

  return null;
}

/* ─── Metric Card ─── */
function Metric({ label, value, note, color = 'default' }: {
  label: string; value: string; note?: string;
  color?: 'default' | 'green' | 'amber' | 'red' | 'violet' | 'blue';
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
      <p className="text-2xl font-bold font-outfit" style={{ color: valueColorMap[color] }}>{value}</p>
      {note && <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{note}</p>}
    </div>
  );
}

/* ─── Quick Action Card ─── */
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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="form-section">
      <p className="text-[11px] font-semibold uppercase tracking-wider mb-4 pb-3 border-b"
        style={{ color: 'var(--text-muted)', borderColor: 'var(--border-default)' }}>{title}</p>
      {children}
    </div>
  );
}

function L1Dashboard({ userName }: { userName: string }) {
  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Good {getGreeting()}, {userName.split(' ')[0]}</h1>
          <p className="page-subtitle">L1 Analyst · Intake Operations</p>
        </div>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Metric label="Calls Today" value="—" note="Go available to start" />
        <Metric label="Tickets Registered" value="—" note="Registered by you" color="green" />
        <Metric label="Avg Handle Time" value="—" note="Per ticket" color="blue" />
        <Metric label="Fraud Reported" value="₹ —" note="Today's total" color="amber" />
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

function L2Dashboard() {
  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Investigation Dashboard</h1>
          <p className="page-subtitle">L2 Officer · Lien &amp; NCCRP Operations</p>
        </div>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Metric label="Golden Hour Alerts" value="—" note="Active SSE alerts" color="red" />
        <Metric label="Pending Lien" value="—" note="T+1 queue" color="amber" />
        <Metric label="NCCRP Filed" value="—" note="Today" color="green" />
        <Metric label="Recovery Rate" value="—%" note="Lien / Fraud" color="violet" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <SectionCard title="Quick Actions">
          <div className="space-y-2.5">
            <QuickAction href="/dashboard/l2/alerts" icon={<Zap className="w-4 h-4" />} label="Golden Hour Alerts" description="Real-time SSE feed — cases within 3 hours" />
            <QuickAction href="/dashboard/l2/pending-lien" icon={<Scale className="w-4 h-4" />} label="Pending Lien" description="T+1 queue — process lien and NCCRP" />
            <QuickAction href="/dashboard/l2/tickets" icon={<FileText className="w-4 h-4" />} label="All Tickets" description="View and manage all complaints" />
          </div>
        </SectionCard>
        <SectionCard title="Work Queue">
          <div className="divide-y" style={{ borderColor: 'var(--border-muted)' }}>
            <Step n={1} text={<>Monitor <strong style={{ color: 'var(--text-heading)' }}>Golden Hour Alerts</strong> for real-time SSE notifications</>} />
            <Step n={2} text={<>Process <strong style={{ color: 'var(--text-heading)' }}>Pending Lien</strong> queue for T+1 financial fraud tickets</>} />
            <Step n={3} text={<>Enter NCCRP acknowledgement number and lien amount for each transaction</>} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function L3Dashboard() {
  return (
    <div className="animate-fade-in-up space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Operations Dashboard</h1>
          <p className="page-subtitle">L3 Supervisor · Floor Management &amp; Administration</p>
        </div>
      </div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <Metric label="Active Agents" value="—" note="Online now" color="green" />
        <Metric label="On Break" value="—" note="Including SLA breaches" color="amber" />
        <Metric label="Tickets Today" value="—" note="All agents" />
        <Metric label="Fraud Registered" value="₹ —" note="Today total" color="red" />
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
            <Step n={3} text={<>Export daily reports via <strong style={{ color: 'var(--text-heading)' }}>Reports → Export CSV</strong></>} />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
