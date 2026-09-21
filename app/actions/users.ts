// ─── app/actions/users.ts ──────────────────────────────────────────────────
// Client-side user management operations.
// Replaces the original 'use server' actions with REST calls to the backend.
// All endpoints require L3 role — enforced by the Express RBAC middleware.
// ───────────────────────────────────────────────────────────────────────────

import apiClient, { ApiError } from '@/lib/api-client';

/** Shape of a user record returned by GET /api/users */
export interface IUserRecord {
  _id: string;
  name: string;
  username: string;
  role: 'L1' | 'L2' | 'L3';
  extension: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// createUser
// Now calls: POST /api/users  (requires L3 token)
// ─────────────────────────────────────────────────────────────────────────────
export async function createUser(data: {
  name: string;
  username: string;
  password: string;
  role: 'L1' | 'L2' | 'L3';
  extension: string;
}) {
  try {
    await apiClient.post('/api/users', data);
    return { success: true };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to create user';
    return { error: message, success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// toggleUserActive
// Now calls: PATCH /api/users/:id/toggle
// ─────────────────────────────────────────────────────────────────────────────
export async function toggleUserActive(userId: string, isActive: boolean) {
  try {
    await apiClient.patch(`/api/users/${userId}/toggle`, { isActive });
    return { success: true };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to update user';
    return { error: message, success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// listUsers
// Now calls: GET /api/users
// ─────────────────────────────────────────────────────────────────────────────
export async function listUsers() {
  try {
    const data = await apiClient.get<{ users: IUserRecord[] }>('/api/users');
    return { users: data.users };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to fetch users';
    return { error: message, users: [] as IUserRecord[] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// resetUserPassword
// Now calls: PATCH /api/users/:id/password
// ─────────────────────────────────────────────────────────────────────────────
export async function resetUserPassword(userId: string, newPassword: string) {
  try {
    await apiClient.patch(`/api/users/${userId}/password`, { newPassword });
    return { success: true };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to reset password';
    return { error: message, success: false };
  }
}
