'use client';

import { useEffect, useState } from 'react';
import { useTelephonyStore } from '@/store/telephonyStore';
import { useBreakStore, BREAK_LABELS, type BreakType } from '@/store/breakStore';
import { useThemeStore } from '@/store/themeStore';
import { useTOSStore, formatTOS } from '@/store/tosStore';
import { startBreak as startBreakAction } from '@/app/actions/breaks';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/layout/UserMenu';
import {
  Phone, PhoneOff, PhoneIncoming, Clock, Coffee, ChevronDown, Bell, Sun, Moon, Menu,
} from 'lucide-react';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TopBarProps {
  role: string;
  userName: string;
  extension: string;
  alertCount?: number;
  loginTimestamp?: number;
}

function formatTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Status dot indicator
function StatusDot({ status }: { status: 'available' | 'oncall' | 'ringing' | 'wrap' | 'break' | 'idle' }) {
  const map = {
    available: 'bg-emerald-500',
    oncall:    'bg-blue-500',
    ringing:   'bg-blue-500 animate-ping',
    wrap:      'bg-violet-500',
    break:     'bg-red-500',
    idle:      'bg-slate-400',
  };
  return (
    <span className="relative flex h-2 w-2 shrink-0">
      {(status === 'oncall' || status === 'available') && (
        <span className={cn('animate-ping absolute inline-flex h-full w-full rounded-full opacity-60', map[status])} />
      )}
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', map[status])} />
    </span>
  );
}

// Strip item for operational status bar
function StripItem({ label, value, mono = false, highlight }: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: 'green' | 'amber' | 'red' | 'blue';
}) {
  const colorMap = {
    green: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red:   'text-red-600 dark:text-red-400',
    blue:  'text-blue-600 dark:text-blue-400',
  };
  return (
    <div className="status-strip-item">
      <span className="status-strip-label">{label}</span>
      <span className={cn(
        'status-strip-value',
        mono && 'font-mono',
        highlight && colorMap[highlight]
      )}>
        {value}
      </span>
    </div>
  );
}

/* ─── TOS Counter ─── */
function TOSCounter({ loginTimestamp }: { loginTimestamp?: number }) {
  const { setStart, getElapsedSeconds } = useTOSStore();
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (loginTimestamp) {
      setStart(loginTimestamp * 1000); // convert from JWT seconds to ms
    }
  }, [loginTimestamp, setStart]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(getElapsedSeconds());
    }, 1000);
    return () => clearInterval(interval);
  }, [getElapsedSeconds]);

  return (
    <div className="tos-badge">
      <Clock className="w-3.5 h-3.5 text-blue-500" />
      <span className="text-[var(--text-muted)] text-[10px] font-medium uppercase tracking-wider">TOS</span>
      <span className="font-mono text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
        {formatTOS(seconds)}
      </span>
    </div>
  );
}

/* ─── Right-side controls (shared across all roles) ─── */
function RightControls({ role, userName, extension, alertCount, loginTimestamp, isDark, toggleTheme }: {
  role: string;
  userName: string;
  extension: string;
  alertCount: number;
  loginTimestamp?: number;
  isDark: boolean;
  toggleTheme: () => void;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-2 shrink-0">
        {/* Mobile sidebar toggle */}
        <button
          id="sidebar-mobile-toggle-btn"
          className="sidebar-mobile-toggle"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* TOS */}
        <TOSCounter loginTimestamp={loginTimestamp} />

        {/* Bell */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="relative theme-toggle" aria-label="Notifications">
              <Bell className="w-4 h-4" />
              {alertCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
                  {alertCount > 9 ? '9+' : alertCount}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Notifications</TooltipContent>
        </Tooltip>

        {/* Theme toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={toggleTheme} className="theme-toggle" aria-label="Toggle theme">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{isDark ? 'Light mode' : 'Dark mode'}</TooltipContent>
        </Tooltip>

        {/* Divider */}
        <div className="w-px h-6 mx-1" style={{ background: 'var(--border-default)' }} />

        {/* User menu */}
        <UserMenu userName={userName} role={role} extension={extension} />
      </div>
    </TooltipProvider>
  );
}

export function TopBar({ role, userName, extension, alertCount = 0, loginTimestamp }: TopBarProps) {
  const {
    state: telState, callerInfo, callDurationSeconds, tickCallDuration,
    goAvailable, goOffline, acceptCall, endCall, simulateIncomingCall,
  } = useTelephonyStore();
  const { startBreak, isOnBreak, breakType } = useBreakStore();
  const { isDark, toggle: toggleTheme } = useThemeStore();

  const [statusSeconds, setStatusSeconds] = useState(0);

  // Status duration timer
  useEffect(() => {
    setStatusSeconds(0);
    const interval = setInterval(() => setStatusSeconds((p) => p + 1), 1000);
    return () => clearInterval(interval);
  }, [telState, isOnBreak]);

  // Call duration ticker
  useEffect(() => {
    const interval = setInterval(tickCallDuration, 1000);
    return () => clearInterval(interval);
  }, [tickCallDuration]);

  const handleBreak = async (bt: BreakType) => {
    const result = await startBreakAction(bt);
    if (result.success && result.breakId) {
      startBreak(bt, result.breakId);
    }
  };

  const simulateMockCall = () => {
    simulateIncomingCall({
      phone: `9${Math.floor(Math.random() * 9e8 + 1e8)}`,
      callId: `call_${Date.now()}`,
    });
  };

  const currentStatusLabel = isOnBreak
    ? (breakType || 'BREAK')
    : telState;

  const dotStatus = isOnBreak
    ? 'break'
    : telState === 'AVAILABLE' ? 'available'
    : telState === 'ON_CALL' ? 'oncall'
    : telState === 'RINGING' ? 'ringing'
    : telState === 'WRAP_UP' ? 'wrap'
    : 'idle';

  const statusHighlight = isOnBreak ? 'red'
    : telState === 'ON_CALL' ? 'blue'
    : telState === 'AVAILABLE' ? 'green'
    : telState === 'RINGING' ? 'blue'
    : undefined;

  /* ─── L3: Management header ─── */
  if (role === 'L3') {
    return (
      <div className="topbar justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
            Analytics &amp; Management
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded font-semibold uppercase tracking-wider"
            style={{
              background: 'rgba(37,99,235,0.08)',
              color: '#2563EB',
              border: '1px solid rgba(37,99,235,0.15)',
            }}>
            L3 Admin
          </span>
        </div>
        <RightControls
          role={role} userName={userName} extension={extension}
          alertCount={alertCount} loginTimestamp={loginTimestamp}
          isDark={isDark} toggleTheme={toggleTheme}
        />
      </div>
    );
  }

  /* ─── L1 / L2: Operational status strip ─── */
  return (
    <div className="topbar justify-between gap-0 px-0">
      {/* Left: Status strip */}
      <div className="flex items-center h-full flex-1 min-w-0 overflow-x-auto">
        {/* Status indicator */}
        <div className={cn(
          'status-strip-item gap-2 pl-4',
          isOnBreak ? 'text-red-600' : telState === 'ON_CALL' ? 'text-blue-600' : 'text-emerald-600'
        )}>
          <StatusDot status={dotStatus} />
          <span className={cn('font-semibold text-xs uppercase tracking-wide', statusHighlight && {
            green: 'text-emerald-600 dark:text-emerald-400',
            amber: 'text-amber-600 dark:text-amber-400',
            red: 'text-red-600 dark:text-red-400',
            blue: 'text-blue-600 dark:text-blue-400',
          }[statusHighlight])}>
            {currentStatusLabel.replace('_', ' ')}
          </span>
        </div>

        <StripItem label="Queue" value="0" />
        <StripItem label="Agent" value={userName.split(' ')[0]} />
        <StripItem label="Ext" value={extension} mono />
        <StripItem label="Campaign" value="Cyber Helpline" />
        <StripItem
          label="Customer"
          value={telState === 'ON_CALL' && callerInfo ? callerInfo.phone : '—'}
          mono
          highlight={telState === 'ON_CALL' ? 'blue' : undefined}
        />
        <StripItem
          label={telState === 'ON_CALL' ? 'Call' : 'Status'}
          value={telState === 'ON_CALL'
            ? formatTime(callDurationSeconds)
            : formatTime(statusSeconds)}
          mono
          highlight={telState === 'ON_CALL' ? 'blue' : undefined}
        />

        {/* Telephony action buttons — L1 only */}
        {role === 'L1' && (
          <div className="flex items-center gap-1.5 px-3 border-r border-[var(--border-default)] h-full shrink-0">
            {telState === 'IDLE' && (
              <Button size="sm" onClick={goAvailable}
                className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 gap-1.5">
                <Phone className="w-3 h-3" /> Available
              </Button>
            )}
            {telState === 'AVAILABLE' && (
              <>
                <Button size="sm" variant="outline" onClick={simulateMockCall}
                  className="h-7 text-xs px-2.5 gap-1.5">
                  <PhoneIncoming className="w-3 h-3" /> Simulate
                </Button>
                <button onClick={goOffline}
                  className="h-7 px-2.5 text-xs transition-colors rounded"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseOver={e => (e.currentTarget.style.color = '#EF4444')}
                  onMouseOut={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
                  Offline
                </button>
              </>
            )}
            {telState === 'RINGING' && callerInfo && (
              <div className="flex items-center gap-1.5">
                <Button size="sm" onClick={acceptCall}
                  className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3 gap-1.5 animate-pulse">
                  <Phone className="w-3 h-3" /> Accept
                </Button>
                <button onClick={goOffline}
                  className="h-7 px-2.5 text-xs text-red-500 hover:text-red-600 transition-colors rounded">
                  Reject
                </button>
              </div>
            )}
            {(telState === 'ON_CALL' || telState === 'WRAP_UP') && (
              <Button size="sm" onClick={endCall}
                className="h-7 text-xs bg-red-600 hover:bg-red-500 text-white px-3 gap-1.5">
                <PhoneOff className="w-3 h-3" /> End Call
              </Button>
            )}
          </div>
        )}

        {/* Break dropdown */}
        {!isOnBreak && (
          <div className="px-3 border-r border-[var(--border-default)] h-full flex items-center shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-md border border-[var(--border-default)] transition-colors hover:bg-[var(--bg-nav-hover)]"
                style={{ color: 'var(--text-body)' }}>
                <Coffee className="w-3 h-3" />
                Break
                <ChevronDown className="w-3 h-3 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[190px] overflow-hidden rounded-xl"
                style={{ background: 'var(--bg-surface)' }}>
                {/* Capped breaks */}
                <div className="px-2.5 pt-2.5 pb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}>Capped Break</p>
                </div>
                <div className="px-1.5 pb-1.5">
                  {(['LUNCH', 'TEA', 'BIO'] as BreakType[]).map((bt) => (
                    <DropdownMenuItem key={bt} onClick={() => handleBreak(bt)}
                      className="text-xs gap-2 cursor-pointer rounded-lg px-2.5 py-2">
                      <Clock className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                      {BREAK_LABELS[bt]}
                    </DropdownMenuItem>
                  ))}
                </div>
                {/* Uncapped breaks */}
                <div className="px-2.5 pt-1.5 pb-1 border-t" style={{ borderColor: 'var(--border-muted)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}>Uncapped Break</p>
                </div>
                <div className="px-1.5 pb-1.5">
                  {(['TRAINING', 'FEEDBACK_QUERY'] as BreakType[]).map((bt) => (
                    <DropdownMenuItem key={bt} onClick={() => handleBreak(bt)}
                      className="text-xs gap-2 cursor-pointer rounded-lg px-2.5 py-2">
                      <Coffee className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                      {BREAK_LABELS[bt]}
                    </DropdownMenuItem>
                  ))}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* Right: Controls */}
      <div className="pl-3 pr-4">
        <RightControls
          role={role} userName={userName} extension={extension}
          alertCount={alertCount} loginTimestamp={loginTimestamp}
          isDark={isDark} toggleTheme={toggleTheme}
        />
      </div>
    </div>
  );
}
