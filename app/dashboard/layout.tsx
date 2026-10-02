'use client';

// ─── app/dashboard/layout.tsx ──────────────────────────────────────────────
// Converted from Server Component (auth()) to Client Component.
// Uses useAuth() to read the JWT-decoded user from AuthProvider.
// Redirects to /login if no authenticated user is found.
// ───────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { BreakLockOverlay } from '@/components/layout/BreakLockOverlay';
import { GoldenHourModal } from '@/components/shared/GoldenHourModal';
import { DashboardShell } from '@/components/layout/DashboardShell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, loginTimestamp } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const showGoldenHour = user.role === 'L2' || user.role === 'L3';

  return (
    <DashboardShell
      role={user.role}
      userName={user.name ?? 'Agent'}
      extension={user.extension ?? '-'}
      loginTimestamp={loginTimestamp ?? Math.floor(Date.now() / 1000)}
      showGoldenHour={showGoldenHour}
    >
      {children}
    </DashboardShell>
  );
}
