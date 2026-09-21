import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: string | number;
  note?: string;
  icon?: LucideIcon;
  color?: 'default' | 'blue' | 'green' | 'amber' | 'red' | 'violet';
  trend?: {
    value: string;
    direction: 'up' | 'down' | 'neutral';
  };
}

const colorConfig = {
  default: {
    value:  'var(--text-heading)',
    accent: 'rgba(37,99,235,0.5)',
    iconBg: 'rgba(37,99,235,0.06)',
    iconBorder: 'rgba(37,99,235,0.12)',
    iconColor: '#2563EB',
  },
  blue: {
    value: '#2563EB',
    accent: '#2563EB',
    iconBg: 'rgba(37,99,235,0.08)',
    iconBorder: 'rgba(37,99,235,0.18)',
    iconColor: '#2563EB',
  },
  green: {
    value: '#16A34A',
    accent: '#16A34A',
    iconBg: 'rgba(22,163,74,0.07)',
    iconBorder: 'rgba(22,163,74,0.15)',
    iconColor: '#16A34A',
  },
  amber: {
    value: '#D97706',
    accent: '#F59E0B',
    iconBg: 'rgba(245,158,11,0.07)',
    iconBorder: 'rgba(245,158,11,0.15)',
    iconColor: '#D97706',
  },
  red: {
    value: '#DC2626',
    accent: '#EF4444',
    iconBg: 'rgba(239,68,68,0.07)',
    iconBorder: 'rgba(239,68,68,0.15)',
    iconColor: '#DC2626',
  },
  violet: {
    value: '#7C3AED',
    accent: '#8B5CF6',
    iconBg: 'rgba(124,58,237,0.07)',
    iconBorder: 'rgba(124,58,237,0.15)',
    iconColor: '#7C3AED',
  },
};

export function MetricCard({ label, value, note, icon: Icon, color = 'default', trend }: MetricCardProps) {
  const cfg = colorConfig[color];

  return (
    <div
      className="stat-card"
      style={{ borderTopColor: cfg.accent, borderTopWidth: 2 }}
    >
      <div className="flex items-start justify-between mb-3">
        <p
          className="text-[11px] font-semibold uppercase tracking-wider leading-tight"
          style={{ color: 'var(--text-muted)' }}
        >
          {label}
        </p>
        {Icon && (
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
            style={{ background: cfg.iconBg, border: `1px solid ${cfg.iconBorder}` }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: cfg.iconColor }} />
          </div>
        )}
      </div>
      <p
        className="text-2xl font-bold font-outfit leading-none"
        style={{ color: cfg.value }}
      >
        {value}
      </p>
      {note && (
        <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
          {note}
        </p>
      )}
      {trend && (
        <p
          className={`text-[11px] mt-1.5 font-medium ${
            trend.direction === 'up'
              ? 'text-emerald-600'
              : trend.direction === 'down'
              ? 'text-red-500'
              : ''
          }`}
          style={trend.direction === 'neutral' ? { color: 'var(--text-muted)' } : undefined}
        >
          {trend.value}
        </p>
      )}
    </div>
  );
}
