// ─── app/actions/changePassword.ts ─────────────────────────────────────────
// Client-side password change.
// The old version hashed passwords client-side (server action).
// Now delegates entirely to the backend — bcrypt runs server-side only.
// ───────────────────────────────────────────────────────────────────────────

import apiClient, { ApiError } from '@/lib/api-client';

export async function changePassword(data: {
  currentPassword: string;
  newPassword: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!data.currentPassword || !data.newPassword) {
    return { success: false, error: 'All fields are required' };
  }
  if (data.newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters' };
  }

  try {
    // POST /api/auth/change-password — verifyToken extracts the user ID from the JWT
    await apiClient.post('/api/auth/change-password', {
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
    return { success: true };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to change password';
    return { success: false, error: message };
  }
}
