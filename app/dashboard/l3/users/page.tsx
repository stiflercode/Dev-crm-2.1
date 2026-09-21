'use client';

// ─── app/dashboard/l3/users/page.tsx ───────────────────────────────────────
// Converted from Server Component (auth() + direct DB) to Client Component.
// Now fetches users via listUsers() which calls GET /api/users on the backend.
// Uses useAuth() from AuthProvider instead of NextAuth's auth().
// ───────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { listUsers, IUserRecord } from '@/app/actions/users';
import { CreateUserModal } from './CreateUserModal';
import { UserActionsCell } from './UserActionsCell';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { ErrorState } from '@/components/shared/ErrorState';
import { SectionCard } from '@/components/shared/SectionCard';
import { Users } from 'lucide-react';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id ?? '';

  const [users, setUsers] = useState<IUserRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    listUsers().then(({ users: data, error: err }) => {
      if (err) setError(err);
      else setUsers(data);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mt-8">
        <ErrorState inline title="Failed to load users" message={error} />
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: 'rgba(37,99,235,0.08)',
              border: '1px solid rgba(37,99,235,0.15)',
            }}
          >
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h1 className="page-title">User Management</h1>
            <p className="page-subtitle">{users.length} agent account{users.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <CreateUserModal />
      </div>

      {/* Users Table */}
      <SectionCard noPadding>
        {users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No agent accounts"
            description="Create the first agent account to get started."
            action={{ label: 'Create Agent', onClick: () => {} }}
            size="md"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="crm-table-header">
                  {['Agent', 'Username', 'Role', 'Extension', 'Status', 'Created', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-[11px] uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user._id}
                    className={`data-table-row border-b border-[var(--border-muted)] last:border-0 ${!user.isActive ? 'opacity-50' : ''}`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ background: 'linear-gradient(135deg, #1D4ED8, #2563EB)' }}
                        >
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                          {user.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {user.username}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={user.role} size="sm" />
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {user.extension}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}
                        />
                        <span
                          className={`text-xs font-medium ${user.isActive ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
                          style={!user.isActive ? { color: 'var(--text-muted)' } : undefined}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(user.createdAt).toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3.5">
                      <UserActionsCell
                        userId={user._id}
                        userName={user.name}
                        isActive={user.isActive}
                        isSelf={user._id === currentUserId}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
