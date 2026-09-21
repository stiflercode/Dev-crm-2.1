'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard, PhoneIncoming, ClipboardList, AlertTriangle,
  Scale, FileSearch, Users, BarChart3, Activity, Shield,
  X, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: string[];
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',                   label: 'Dashboard',       icon: <LayoutDashboard className="w-[17px] h-[17px]" />, roles: ['L1', 'L2', 'L3'] },
  { href: '/dashboard/track-complaint',   label: 'Track Complaint', icon: <FileSearch className="w-[17px] h-[17px]" />,      roles: ['L1', 'L2', 'L3'] },
  { href: '/dashboard/l1/new-complaint',  label: 'New Complaint',   icon: <PhoneIncoming className="w-[17px] h-[17px]" />,   roles: ['L1', 'L2', 'L3'] },
  { href: '/dashboard/l1/my-tickets',     label: 'My Tickets',      icon: <ClipboardList className="w-[17px] h-[17px]" />,   roles: ['L1'] },
  { href: '/dashboard/l2/alerts',         label: 'Golden Hour',     icon: <AlertTriangle className="w-[17px] h-[17px]" />,   roles: ['L2', 'L3'] },
  { href: '/dashboard/l2/pending-lien',   label: 'Pending Lien',    icon: <Scale className="w-[17px] h-[17px]" />,           roles: ['L2', 'L3'] },
  { href: '/dashboard/l2/tickets',        label: 'All Tickets',     icon: <FileSearch className="w-[17px] h-[17px]" />,      roles: ['L2', 'L3'] },
  { href: '/dashboard/l3/roster',         label: 'Live Roster',     icon: <Activity className="w-[17px] h-[17px]" />,        roles: ['L3'] },
  { href: '/dashboard/l3/users',          label: 'Users',           icon: <Users className="w-[17px] h-[17px]" />,           roles: ['L3'] },
  { href: '/dashboard/l3/reports',        label: 'Reports',         icon: <BarChart3 className="w-[17px] h-[17px]" />,       roles: ['L3'] },
];

interface SidebarProps {
  role: string;
  userName: string;
  extension: string;
  collapsed?: boolean;
  onCollapsedChange?: (v: boolean) => void;
}

function getRoleLabel(role: string): string {
  if (role === 'L1') return 'Analyst (L1)';
  if (role === 'L2') return 'Investigator (L2)';
  if (role === 'L3') return 'Supervisor (L3)';
  return role;
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

interface NavSectionProps {
  label: string;
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
  onNavClick?: () => void;
}

function NavSection({ label, items, pathname, collapsed, onNavClick }: NavSectionProps) {
  if (items.length === 0) return null;
  return (
    <div className="mb-1">
      {!collapsed && <p className="nav-section-label">{label}</p>}
      {collapsed && <div className="h-3" />}
      <div className={cn('space-y-0.5', collapsed ? 'px-1.5' : 'px-2')}>
        {items.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === item.href || pathname.startsWith(item.href + '/');

          const navEl = (
            <Link key={item.href} href={item.href} onClick={onNavClick}>
              <div className={cn(
                'nav-item',
                isActive && 'active',
                collapsed && 'nav-collapsed',
              )}>
                <span className={cn(
                  'nav-icon shrink-0 transition-colors',
                  isActive ? 'text-blue-600 dark:text-blue-400' : 'text-[var(--text-muted)]'
                )}>
                  {item.icon}
                </span>
                {!collapsed && (
                  <span className="flex-1 truncate text-[0.8125rem]">
                    {item.label}
                  </span>
                )}
                {!collapsed && item.badge && (
                  <span className="ml-auto text-[10px] bg-red-50 text-red-600 border border-red-200 rounded px-1.5 py-0.5 font-semibold dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/50">
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href} delayDuration={100}>
                <TooltipTrigger asChild>{navEl}</TooltipTrigger>
                <TooltipContent side="right" className="text-xs font-medium">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }
          return navEl;
        })}
      </div>
    </div>
  );
}

export function Sidebar({ role, userName, extension, collapsed = false, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const filtered = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const generalItems = filtered.filter((i) =>
    ['/dashboard', '/dashboard/track-complaint', '/dashboard/l1/new-complaint', '/dashboard/l1/my-tickets'].includes(i.href)
  );
  const investigationItems = filtered.filter((i) => i.href.startsWith('/dashboard/l2'));
  const adminItems = filtered.filter((i) => i.href.startsWith('/dashboard/l3'));

  const initials = getInitials(userName);
  const roleLabel = getRoleLabel(role);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const el = document.getElementById('sidebar-mobile-toggle-btn');
    if (!el) return;
    const handler = () => setMobileOpen(v => !v);
    el.addEventListener('click', handler);
    return () => el.removeEventListener('click', handler);
  }, []);

  return (
    <TooltipProvider>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="sidebar-mobile-overlay"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <nav className={cn(
        'dashboard-sidebar',
        mobileOpen && 'mobile-open',
        collapsed && 'sidebar-collapsed',
      )}>
        {/* ── Logo ── */}
        <div
          className={cn(
            'flex items-center gap-3 py-[15px] flex-shrink-0',
            collapsed ? 'px-[13px] justify-center' : 'px-4',
          )}
          style={{ borderBottom: '1px solid var(--border-sidebar)' }}
        >
          <div className="logo-icon shrink-0">
            <Shield className="w-[17px] h-[17px] text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="logo-text">1930</div>
              <div className="logo-sub">Cyber Helpline CRM</div>
            </div>
          )}
          {/* Mobile close */}
          <button
            className="lg:hidden flex items-center justify-center w-7 h-7 rounded-md transition-colors shrink-0 ml-auto"
            onClick={() => setMobileOpen(false)}
            style={{ color: 'var(--text-muted)' }}
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Navigation ── */}
        <ScrollArea className="flex-1 py-2">
          <NavSection
            label="General"
            items={generalItems}
            pathname={pathname}
            collapsed={collapsed}
            onNavClick={() => setMobileOpen(false)}
          />
          {investigationItems.length > 0 && (
            <NavSection
              label="Investigation"
              items={investigationItems}
              pathname={pathname}
              collapsed={collapsed}
              onNavClick={() => setMobileOpen(false)}
            />
          )}
          {adminItems.length > 0 && (
            <NavSection
              label="Administration"
              items={adminItems}
              pathname={pathname}
              collapsed={collapsed}
              onNavClick={() => setMobileOpen(false)}
            />
          )}
        </ScrollArea>

        {/* ── Footer: User card + collapse toggle ── */}
        <div
          className="p-2.5 flex-shrink-0 space-y-2"
          style={{ borderTop: '1px solid var(--border-sidebar)' }}
        >
          {/* Desktop collapse toggle */}
          <div className="hidden lg:flex justify-end">
            <button
              onClick={() => onCollapsedChange?.(!collapsed)}
              className="sidebar-collapse-btn"
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed
                ? <ChevronRight className="w-3.5 h-3.5" />
                : <ChevronLeft className="w-3.5 h-3.5" />
              }
            </button>
          </div>

          {/* User info */}
          {collapsed ? (
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <div className="flex justify-center cursor-pointer pb-0.5">
                  <div className="sidebar-user-avatar">
                    {initials}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="text-xs">
                <p className="font-semibold">{userName}</p>
                <p className="text-muted-foreground">{roleLabel} · Ext {extension}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="sidebar-user-card">
              <div className="sidebar-user-avatar shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="sidebar-user-name">{userName}</p>
                <p className="sidebar-user-meta">{roleLabel} · Ext {extension}</p>
              </div>
            </div>
          )}
        </div>
      </nav>
    </TooltipProvider>
  );
}
