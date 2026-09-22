'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { BreakLockOverlay } from '@/components/layout/BreakLockOverlay';
import { GoldenHourModal } from '@/components/shared/GoldenHourModal';
import { cn } from '@/lib/utils';

interface DashboardShellProps {
  role: string;
  userName: string;
  extension: string;
  loginTimestamp: number;
  showGoldenHour: boolean;
  children: React.ReactNode;
}

export function DashboardShell({
  role,
  userName,
  extension,
  loginTimestamp,
  showGoldenHour,
  children,
}: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-app)' }}>
      {/* Sidebar — passes collapsed state down */}
      <Sidebar
        role={role}
        userName={userName}
        extension={extension}
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
      />

      {/* Main content area — shifts when sidebar collapses */}
      <div className={cn(
        'dashboard-main flex flex-col w-full min-w-0 transition-all duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)]',
        collapsed ? 'ml-[60px]' : 'ml-[232px]',
      )}>
        <TopBar
          role={role}
          userName={userName}
          extension={extension}
          loginTimestamp={loginTimestamp}
        />

        <main className="flex-1 page-content pb-8">
          {children}
        </main>
      </div>

      {/* Global overlays */}
      <BreakLockOverlay />
      {showGoldenHour && <GoldenHourModal />}
    </div>
  );
}
