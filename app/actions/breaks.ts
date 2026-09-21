// ─── app/actions/breaks.ts ─────────────────────────────────────────────────
// Client-side agent break and status management.
// Replaces the original 'use server' actions — calls the Express backend.
// Agent identity is taken from the JWT (never from request body).
// ───────────────────────────────────────────────────────────────────────────

import apiClient, { ApiError } from '@/lib/api-client';
import { type BreakType } from '@/store/breakStore';

// ─────────────────────────────────────────────────────────────────────────────
// startBreak
// Now calls: POST /api/agents/breaks/start
// ─────────────────────────────────────────────────────────────────────────────
export async function startBreak(breakType: BreakType) {
  try {
    const data = await apiClient.post<{ success: boolean; breakId: string }>(
      '/api/agents/breaks/start',
      { breakType }
    );
    return { success: true, breakId: data.breakId };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to start break';
    return { error: message, success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// endBreak
// Now calls: POST /api/agents/breaks/:id/end
// ─────────────────────────────────────────────────────────────────────────────
export async function endBreak(breakId: string) {
  try {
    const data = await apiClient.post<{ success: boolean; durationSeconds: number }>(
      `/api/agents/breaks/${breakId}/end`
    );
    return { success: true, durationSeconds: data.durationSeconds };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to end break';
    return { error: message, success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// verifyPasswordForUnlock
// Now calls: POST /api/agents/verify-password
// ─────────────────────────────────────────────────────────────────────────────
export async function verifyPasswordForUnlock(password: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    await apiClient.post('/api/agents/verify-password', { password });
    return { success: true };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Verification failed';
    return { success: false, error: message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateAgentStatus
// Now calls: PATCH /api/agents/status
// ─────────────────────────────────────────────────────────────────────────────
export async function updateAgentStatus(
  status: 'AVAILABLE' | 'ON_CALL' | 'WRAP_UP' | 'OFFLINE'
) {
  try {
    await apiClient.patch('/api/agents/status', { status });
    return { success: true };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to update status';
    return { error: message, success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getAgentRosterForToday
// Now calls: GET /api/agents/roster (L3 only — enforced by backend RBAC)
// ─────────────────────────────────────────────────────────────────────────────
export async function getAgentRosterForToday() {
  try {
    const data = await apiClient.get<{ roster: unknown[] }>('/api/agents/roster');
    return { roster: data.roster };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to fetch roster';
    return { error: message, roster: [] };
  }
}
