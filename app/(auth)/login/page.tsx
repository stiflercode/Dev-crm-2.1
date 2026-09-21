'use client';

import { useState } from 'react';
import apiClient, { ApiError } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import {
  Shield, Eye, EyeOff, AlertCircle,
  Lock, User, ArrowRight, CheckCircle,
  Activity, Database, Globe, Zap, ChevronRight,
} from 'lucide-react';

const FEATURES = [
  { icon: Activity,  label: 'Real-time Operations',   desc: 'Live case tracking & SLA alerts' },
  { icon: Database,  label: 'Secure Case Management', desc: 'End-to-end encrypted records' },
  { icon: Globe,     label: 'Multi-Role Access',      desc: 'L1 · L2 · L3 workflows' },
  { icon: Zap,       label: 'Golden Hour Protocol',   desc: 'Rapid response within 3 hours' },
];

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Fallback to DOM values if browser autofilled without firing onChange
    const form = e.currentTarget;
    const formUsername = ((form.elements.namedItem('username') as HTMLInputElement)?.value || username).trim();
    const formPassword = (form.elements.namedItem('password') as HTMLInputElement)?.value || password;

    if (!formUsername || !formPassword) {
      setError('Please enter both username and password.');
      setIsLoading(false);
      return;
    }

    try {
      console.log('[Login] Attempting sign-in for:', formUsername);
      await apiClient.login(formUsername, formPassword);
      console.log('[Login] Sign-in successful, redirecting to /dashboard');
      window.location.href = '/dashboard';
    } catch (err: any) {
      console.error('[Login] Error:', err);
      const status = err?.status ?? err?.response?.status;
      const message = err?.message || '';

      if (status === 401 || message.includes('401') || message.includes('Invalid credentials')) {
        setError('Invalid username or password. Please try again.');
      } else if (status === 503 || message.includes('503') || message.includes('Database unavailable')) {
        setError('Database unavailable. Please check the backend server logs.');
      } else if (message.includes('fetch') || message.includes('Failed to fetch') || message.includes('NetworkError')) {
        setError('Cannot reach the backend server. Make sure port 8080 is running.');
      } else {
        setError(message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const canSubmit = !isLoading;


  return (
    <div
      className="min-h-screen flex"
      style={{ background: 'var(--login-bg, #F0F4FA)', fontFamily: 'var(--font-inter)' }}
    >
      {/* ── LEFT PANEL ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[460px] shrink-0 relative overflow-hidden"
        style={{
          background: 'linear-gradient(155deg, #0A1628 0%, #0F2342 40%, #1a3a5c 75%, #1D4ED8 100%)',
        }}
      >
        {/* Grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none"
          aria-hidden
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
        {/* Glow orbs */}
        <div
          className="absolute top-[-80px] right-[-80px] w-[420px] h-[420px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.22) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-[-60px] left-[-60px] w-[360px] h-[360px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)' }}
        />
        {/* Diagonal accent line */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, transparent 60%, rgba(37,99,235,0.08) 100%)',
          }}
        />

        {/* Content */}
        <div className="relative z-10 px-10 pt-10">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-12">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.18)',
                backdropFilter: 'blur(8px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              }}
            >
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-outfit font-bold text-2xl leading-none tracking-tight">1930</p>
              <p className="text-blue-300/70 text-[10px] font-semibold uppercase tracking-[0.18em] mt-0.5">
                Cyber Helpline
              </p>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-[2rem] font-outfit font-bold text-white leading-[1.15] mb-4 tracking-tight">
            Protecting Citizens<br />
            <span
              className="text-transparent bg-clip-text"
              style={{
                backgroundImage: 'linear-gradient(90deg, #93C5FD, #60A5FA)',
              }}
            >
              from Cybercrime
            </span>
          </h1>
          <p className="text-blue-100/60 text-[0.875rem] leading-relaxed max-w-[280px]">
            India's national cybercrime reporting helpline. A secure, agent-only case management platform.
          </p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 px-10 pb-10 space-y-2.5">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-xl px-4 py-3 group"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: 'rgba(59,130,246,0.2)' }}
              >
                <Icon className="w-4 h-4 text-blue-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-semibold">{label}</p>
                <p className="text-blue-200/50 text-[11px] mt-0.5">{desc}</p>
              </div>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400/70 shrink-0" />
            </div>
          ))}

          <p className="text-blue-200/30 text-[10px] pt-3 leading-relaxed">
            Ministry of Home Affairs &middot; Government of India &middot; Authorized Personnel Only
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">
        {/* Subtle grid — mobile */}
        <div
          className="absolute inset-0 pointer-events-none lg:hidden"
          aria-hidden
          style={{
            backgroundImage:
              'linear-gradient(rgba(37,99,235,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.03) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Mobile brand */}
        <div className="flex lg:hidden items-center gap-2.5 mb-10">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #1D4ED8, #2563EB)', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}
          >
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-outfit font-bold text-xl leading-none tracking-tight" style={{ color: 'var(--login-heading)' }}>
              1930
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] mt-0.5 text-blue-600">
              Cyber Helpline
            </p>
          </div>
        </div>

        {/* Form card */}
        <div className="relative z-10 w-full max-w-[400px] animate-fade-in-up">
          {/* Heading */}
          <div className="mb-8">
            <h2
              className="text-[1.625rem] font-outfit font-bold mb-1.5 tracking-tight"
              style={{ color: 'var(--login-heading)' }}
            >
              Welcome back
            </h2>
            <p className="text-sm" style={{ color: 'var(--login-muted)' }}>
              Sign in to your agent portal to continue
            </p>
          </div>

          {/* Card */}
          <div
            className="rounded-2xl p-7 mb-4"
            style={{
              background: 'var(--login-card)',
              border: '1px solid var(--login-border)',
              boxShadow: '0 4px 24px rgba(15,23,42,0.07), 0 1px 3px rgba(15,23,42,0.04)',
            }}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="username"
                  className="text-sm font-medium"
                  style={{ color: 'var(--login-label)' }}
                >
                  Username
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: 'var(--login-muted)' }}
                  />
                  <input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="e.g. analyst.priya"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoComplete="username"
                    autoFocus
                    className="login-input pl-10"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="password"
                  className="text-sm font-medium"
                  style={{ color: 'var(--login-label)' }}
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                    style={{ color: 'var(--login-muted)' }}
                  />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="login-input pl-10 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors rounded-md p-0.5"
                    style={{ color: 'var(--login-muted)' }}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div
                  className="flex items-center gap-2 text-sm rounded-lg px-3.5 py-2.5"
                  style={{
                    color: '#DC2626',
                    background: 'rgba(220,38,38,0.06)',
                    border: '1px solid rgba(220,38,38,0.18)',
                  }}
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full h-11 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group relative overflow-hidden"
                style={{
                  background: canSubmit
                    ? 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)'
                    : 'rgba(37,99,235,0.4)',
                  boxShadow: canSubmit ? '0 4px 16px rgba(37,99,235,0.35)' : 'none',
                }}
              >
                {/* Shine */}
                {canSubmit && (
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 60%)',
                    }}
                  />
                )}
                {isLoading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Security notice */}
          <div
            className="flex items-center gap-2.5 rounded-xl px-4 py-3 text-xs"
            style={{
              background: 'rgba(37,99,235,0.04)',
              border: '1px solid rgba(37,99,235,0.10)',
              color: 'var(--login-muted)',
            }}
          >
            <Shield className="w-3.5 h-3.5 shrink-0 text-blue-500" />
            <span>
              Secure connection. Authorized personnel only. All access is logged and monitored.
            </span>
          </div>
        </div>

        {/* Footer */}
        <p
          className="relative z-10 text-center text-[11px] mt-8"
          style={{ color: 'var(--login-muted)' }}
        >
          1930 Cyber Helpline CRM &middot; Confidential System &middot; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
