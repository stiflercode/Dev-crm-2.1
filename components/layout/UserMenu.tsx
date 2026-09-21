'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { User, Lock, LogOut, ChevronDown, AlertCircle } from 'lucide-react';
import { ChangePasswordModal } from './ChangePasswordModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

interface UserMenuProps {
  userName: string;
  role: string;
  extension: string;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getRoleLabel(role: string): string {
  if (role === 'L1') return 'Analyst (L1)';
  if (role === 'L2') return 'Investigator (L2)';
  if (role === 'L3') return 'Supervisor (L3)';
  return role;
}

export function UserMenu({ userName, role, extension }: UserMenuProps) {
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const initials = getInitials(userName);
  const roleLabel = getRoleLabel(role);

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            'flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all outline-none cursor-pointer',
            'border-transparent hover:bg-[var(--bg-nav-hover)] hover:border-[var(--border-default)]',
          )}
        >
          {/* Avatar */}
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #1D4ED8, #2563EB)' }}
          >
            {initials}
          </div>
          {/* Name + role */}
          <div className="hidden sm:flex flex-col items-start min-w-0">
            <span
              className="text-xs font-semibold leading-tight truncate max-w-[120px]"
              style={{ color: 'var(--text-primary)' }}
            >
              {userName}
            </span>
            <span className="text-[10px] leading-tight" style={{ color: 'var(--text-muted)' }}>
              {roleLabel}
            </span>
          </div>
          <ChevronDown
            className="w-3.5 h-3.5 shrink-0 transition-transform duration-150"
            style={{ color: 'var(--text-muted)' }}
          />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-56 rounded-xl overflow-hidden"
          style={{
            background: 'var(--bg-surface)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {/* User info header — plain div, not a MenuLabel */}
          <div
            className="px-3 py-3 border-b"
            style={{ borderColor: 'var(--border-muted)' }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #1D4ED8, #2563EB)' }}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <p
                  className="text-[0.8125rem] font-semibold truncate"
                  style={{ color: 'var(--text-heading)' }}
                >
                  {userName}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {roleLabel} · Ext {extension}
                </p>
              </div>
            </div>
          </div>

          <div className="p-1.5">
            <DropdownMenuItem
              className="flex items-center gap-2.5 px-3 py-2.5 text-sm cursor-pointer rounded-lg transition-colors"
              style={{ color: 'var(--text-body)' }}
              onClick={() => {}}
            >
              <User className="w-4 h-4 shrink-0" style={{ color: 'var(--text-secondary)' }} />
              My Profile
            </DropdownMenuItem>

            <DropdownMenuItem
              className="flex items-center gap-2.5 px-3 py-2.5 text-sm cursor-pointer rounded-lg transition-colors"
              style={{ color: 'var(--text-body)' }}
              onClick={() => setShowChangePassword(true)}
            >
              <Lock className="w-4 h-4 shrink-0" style={{ color: 'var(--text-secondary)' }} />
              Change Password
            </DropdownMenuItem>
          </div>

          <div
            className="p-1.5 border-t"
            style={{ borderColor: 'var(--border-muted)' }}
          >
            <DropdownMenuItem
              className="flex items-center gap-2.5 px-3 py-2.5 text-sm cursor-pointer rounded-lg transition-colors text-red-600 dark:text-red-400"
              onClick={() => setShowLogoutConfirm(true)}
            >
              <LogOut className="w-4 h-4 shrink-0 text-red-500" />
              Sign Out
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Change Password Dialog */}
      <ChangePasswordModal
        open={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />

      {/* Logout Confirm */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent
          className="max-w-sm rounded-2xl"
          style={{
            background: 'var(--bg-surface)',
            borderColor: 'var(--border-default)',
            boxShadow: 'var(--shadow-xl)',
          }}
        >
          <AlertDialogHeader>
            <div className="flex items-center justify-center mb-3">
              <div
                className="flex items-center justify-center w-12 h-12 rounded-full"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                }}
              >
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
            </div>
            <AlertDialogTitle
              className="text-center text-base font-semibold"
              style={{ color: 'var(--text-heading)' }}
            >
              Sign Out
            </AlertDialogTitle>
            <AlertDialogDescription
              className="text-center text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              Are you sure you want to sign out of this session?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3 mt-2">
            <AlertDialogCancel
              className="flex-1 h-10 rounded-lg text-sm font-medium"
              style={{
                borderColor: 'var(--border-default)',
                color: 'var(--text-body)',
                background: 'var(--bg-surface)',
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex-1 h-10 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {loggingOut ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing out...
                </span>
              ) : (
                'Sign Out'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
