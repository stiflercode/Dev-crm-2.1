// ─── app/actions/lien.ts ───────────────────────────────────────────────────
// Client-side lien management operations.
// Replaces the original 'use server' actions — all calls go to the backend.
// RBAC (L2/L3 only) is enforced by the Express middleware.
// ───────────────────────────────────────────────────────────────────────────

import apiClient, { ApiError } from '@/lib/api-client';

// ─────────────────────────────────────────────────────────────────────────────
// updateTransactionLien
// Now calls: PATCH /api/lien/:id/transaction/:txId
// ─────────────────────────────────────────────────────────────────────────────
export async function updateTransactionLien(
  ticketId: string,
  transactionId: string,
  data: { nccrpAckNumber: string; lienAmount: number }
) {
  try {
    const result = await apiClient.patch<{
      success: boolean;
      totalLienAmount: number;
      recoveryRate: number;
    }>(`/api/lien/${ticketId}/transaction/${transactionId}`, data);
    return { success: true, totalLienAmount: result.totalLienAmount, recoveryRate: result.recoveryRate };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to update lien';
    return { error: message, success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getTicketById
// Now calls: GET /api/lien/:id
// ─────────────────────────────────────────────────────────────────────────────
export async function getTicketById(ticketId: string) {
  try {
    const data = await apiClient.get<{ ticket: unknown }>(`/api/lien/${ticketId}`);
    return { ticket: data.ticket };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to fetch ticket';
    return { error: message, ticket: null };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getPendingLienTickets
// Now calls: GET /api/lien/pending
// ─────────────────────────────────────────────────────────────────────────────
export async function getPendingLienTickets() {
  try {
    const data = await apiClient.get<{ tickets: unknown[] }>('/api/lien/pending');
    return { tickets: data.tickets };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to fetch pending lien tickets';
    return { error: message, tickets: [] };
  }
}
