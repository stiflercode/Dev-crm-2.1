'use client';

import { cn } from '@/lib/utils';

type StatusType =
  | 'AVAILABLE'
  | 'ON_CALL'
  | 'WRAP_UP'
  | 'ON_BREAK'
  | 'OFFLINE'
  | 'DRAFT'
  | 'L1_REGISTERED'
  | 'L2_PENDING'
  | 'REGISTERED_IN_NCCRP'
  | 'LIEN_CONFIRMED'
  | 'GOLDEN_HOUR'
  | 'SLA_BREACH'
  | 'L1'
  | 'L2'
  | 'L3';

const STATUS_CONFIG: Record<
  StatusType,
  { label: string; className: string; dot?: string; pulse?: boolean }
> = {
  // Agent statuses
  AVAILABLE:  { label: 'Available',    className: 'status-available', dot: 'bg-emerald-500', pulse: true },
  ON_CALL:    { label: 'On Call',      className: 'status-on-call',   dot: 'bg-blue-500',    pulse: true },
  WRAP_UP:    { label: 'Wrap-Up',      className: 'status-wrap-up',   dot: 'bg-violet-500' },
  ON_BREAK:   { label: 'On Break',     className: 'status-on-break',  dot: 'bg-amber-500' },
  OFFLINE:    { label: 'Offline',      className: 'status-offline',   dot: 'bg-slate-400' },

  // Ticket statuses
  DRAFT:               { label: 'Draft',         className: 'status-offline' },
  L1_REGISTERED:       { label: 'L1 Registered', className: 'status-available' },
  L2_PENDING:          { label: 'L2 Pending',    className: 'status-on-call' },
  REGISTERED_IN_NCCRP: { label: 'NCCRP Filed',   className: 'status-wrap-up' },
  LIEN_CONFIRMED:      { label: 'Lien Confirmed', className: 'status-on-break' },

  // Priority indicators
  GOLDEN_HOUR: { label: 'Golden Hour', className: 'status-breach', dot: 'bg-red-500', pulse: true },
  SLA_BREACH:  { label: 'SLA Breach',  className: 'status-breach', dot: 'bg-red-500', pulse: true },

  // Roles
  L1: { label: 'L1 Analyst',    className: 'status-available' },
  L2: { label: 'L2 Officer',    className: 'status-on-call' },
  L3: { label: 'L3 Supervisor', className: 'status-wrap-up' },
};

interface StatusBadgeProps {
  status: StatusType | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function StatusBadge({ status, size = 'sm', className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status as StatusType] ?? {
    label: status,
    className: 'status-offline',
  };

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1.5',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-xs px-3 py-1.5 gap-2',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md font-medium tracking-wide',
        sizeClasses[size],
        config.className,
        className
      )}
    >
      {config.dot && (
        <span className="relative flex shrink-0" style={{ width: size === 'sm' ? 5 : 6, height: size === 'sm' ? 5 : 6 }}>
          {config.pulse && (
            <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-60', config.dot)} />
          )}
          <span className={cn('relative inline-flex rounded-full h-full w-full', config.dot)} />
        </span>
      )}
      {config.label}
    </span>
  );
}
