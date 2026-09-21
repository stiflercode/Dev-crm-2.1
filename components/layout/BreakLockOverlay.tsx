'use client';

import { useEffect, useState } from 'react';
import { useBreakStore, BREAK_LABELS, BREAK_CAPS, type BreakType } from '@/store/breakStore';
import { verifyPasswordForUnlock, endBreak } from '@/app/actions/breaks';
import { Shield, Lock, Eye, EyeOff, Timer, Coffee, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function BreakLockOverlay() {
  const {
    isScreenLocked,
    isOnBreak,
    breakType,
    breakId,
    breakElapsedSeconds,
    isUnlocking,
    unlockError,
    setUnlocking,
    setUnlockError,
    endBreak: storeEndBreak,
    tickBreakDuration,
  } = useBreakStore();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSLAWarning, setIsSLAWarning] = useState(false);

  // Tick break duration every second
  useEffect(() => {
    if (!isOnBreak) return;
    const interval = setInterval(tickBreakDuration, 1000);
    return () => clearInterval(interval);
  }, [isOnBreak, tickBreakDuration]);

  // Check SLA cap breach
  useEffect(() => {
    if (!breakType) return;
    const cap = BREAK_CAPS[breakType];
    if (cap && breakElapsedSeconds >= cap) setIsSLAWarning(true);
  }, [breakElapsedSeconds, breakType]);

  const handleUnlock = async () => {
    if (!password || !breakId) return;
    setUnlocking(true);
    setUnlockError(null);
    try {
      const result = await verifyPasswordForUnlock(password);
      if (result.success) {
        await endBreak(breakId);
        storeEndBreak();
        setPassword('');
      } else {
        setUnlockError(result.error || 'Incorrect password');
      }
    } catch {
      setUnlockError('An error occurred. Please try again.');
    } finally {
      setUnlocking(false);
    }
  };

  if (!isScreenLocked) return null;

  const cap = breakType ? BREAK_CAPS[breakType] : null;
  const progressPercent = cap ? Math.min(100, (breakElapsedSeconds / cap) * 100) : 0;
  const remaining = cap ? Math.max(0, cap - breakElapsedSeconds) : null;

  return (
    <div className="break-lock-overlay" style={{ background: 'var(--bg-app)' }}>
      <div className="relative z-10 w-full max-w-sm mx-4 animate-fade-in-up">

        {/* Break icon + label */}
        <div className="text-center mb-6">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
          >
            <Coffee className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
          </div>
          <h1
            className="font-outfit text-xl font-bold"
            style={{ color: 'var(--text-heading)' }}
          >
            {breakType ? BREAK_LABELS[breakType as BreakType] : 'On Break'}
          </h1>
          <p
            className="text-xs mt-1"
            style={{ color: 'var(--text-muted)' }}
          >
            Screen locked — enter your password to return
          </p>
        </div>

        {/* Timer card */}
        <div className={cn(
          'rounded-xl border p-5 mb-4 text-center',
        )}
          style={{
            background: isSLAWarning ? 'rgba(245,158,11,0.06)' : 'var(--bg-elevated)',
            borderColor: isSLAWarning ? 'rgba(245,158,11,0.3)' : 'var(--border-default)',
          }}
        >
          <div className="flex items-center justify-center gap-1.5 mb-2" style={{ color: 'var(--text-muted)' }}>
            <Timer className="w-3 h-3" />
            <span className="text-[10px] uppercase tracking-widest font-semibold">Time Elapsed</span>
          </div>
          <p className={cn(
            'font-mono text-4xl font-bold tracking-tight',
            isSLAWarning ? 'text-amber-500' : ''
          )}
            style={!isSLAWarning ? { color: 'var(--text-heading)' } : undefined}
          >
            {formatTime(breakElapsedSeconds)}
          </p>

          {cap && (
            <div className="mt-3">
              <div className="flex justify-between text-[11px] mb-1.5">
                <span style={{ color: 'var(--text-muted)' }}>Limit: {formatTime(cap)}</span>
                {isSLAWarning ? (
                  <span className="text-amber-500 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Limit exceeded
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-secondary)' }}>{formatTime(remaining!)} left</span>
                )}
              </div>
              <div
                className="w-full rounded-full h-1.5 overflow-hidden"
                style={{ background: 'var(--border-default)' }}
              >
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-1000',
                    progressPercent >= 100 ? 'bg-amber-500' : 'bg-blue-600'
                  )}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Re-authentication form */}
        <div
          className="rounded-xl border p-5"
          style={{ background: 'var(--bg-surface)', borderColor: 'var(--border-default)' }}
        >
          <div className="flex items-center gap-1.5 mb-3">
            <Lock className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              Re-authenticate to resume
            </span>
          </div>

          <div className="relative mb-3">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              className="crm-input pr-10"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: 'var(--text-muted)' }}
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          {unlockError && (
            <p className="text-red-500 text-xs mb-3 flex items-center gap-1.5">
              <Shield className="w-3 h-3" />
              {unlockError}
            </p>
          )}

          <Button
            onClick={handleUnlock}
            disabled={isUnlocking || !password}
            className="w-full h-9 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-50"
          >
            {isUnlocking ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Verifying...
              </>
            ) : 'Unlock & Return to Desk'}
          </Button>
        </div>

        <p
          className="text-center text-[11px] mt-4"
          style={{ color: 'var(--text-muted)' }}
        >
          This screen cannot be closed. Contact your supervisor for assistance.
        </p>
      </div>
    </div>
  );
}
