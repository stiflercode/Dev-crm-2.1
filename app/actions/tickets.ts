// ─── app/actions/tickets.ts ────────────────────────────────────────────────
// Client-side ticket operations — replaces the original 'use server' actions.
// All database calls are now delegated to the Express backend via apiClient.
//
// These functions are safe to call from any Client Component.
// They are NOT server actions — the 'use server' directive has been removed.
// ───────────────────────────────────────────────────────────────────────────

import apiClient, { ApiError } from '@/lib/api-client';

// ─── Shared Input Types (unchanged from the original server action) ───────────

export interface TransactionInput {
  utrNumber: string;
  bankName: string;
  accountNumber?: string;
  upiId?: string;
  transactionAmount: number;
  transactionDateTime: string;
  referenceNumber?: string;
  transactionRemarks?: string;
  paymentGatewayDetails?: string;
  affectedSystemDetails?: string;
  merchantInfo?: string;
  proofOfOwnership?: string;
}

export interface SuspectAddressInput {
  houseNo?: string;
  streetName?: string;
  colony?: string;
  villageTownCity?: string;
  country?: string;
  state?: string;
  district?: string;
  pincode?: string;
}

export interface SuspectDetailsInput {
  name?: string;
  mobileNumber?: string;
  email?: string;
  bankAccountOrUPI?: string;
  address?: SuspectAddressInput;
  remarks?: string;
}

export interface CreateTicketInput {
  victimDetails: {
    name: string;
    contactNumber: string;
    alternateContact?: string;
    address?: string;
    district?: string;
    state?: string;
    email?: string;
  };
  nearestPoliceStation?: string;
  identificationDetails?: {
    type?: string;
    id?: string;
  };
  sensitivity?: boolean;
  priority?: boolean;
  categoryDetails: {
    category: string;
    subCategory: string;
    platform?: string;
    platformUrl?: string;
    platformHandle?: string;
    description?: string;
  };
  suspectDetails?: SuspectDetailsInput;
  transactions: TransactionInput[];
  incidentDateTime?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// createTicket
// Replaces: POST to Ticket.create() in the original server action
// Now calls:  POST /api/tickets
// ─────────────────────────────────────────────────────────────────────────────
export async function createTicket(input: CreateTicketInput) {
  try {
    const data = await apiClient.post<{
      success: boolean;
      complaintId: string;
      isGoldenHour: boolean;
      ticketId: string;
    }>('/api/tickets', input);

    return { success: true, complaintId: data.complaintId, isGoldenHour: data.isGoldenHour, ticketId: data.ticketId };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to create ticket';
    return { error: message, success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// saveDraft
// Now calls: POST /api/tickets/draft
// ─────────────────────────────────────────────────────────────────────────────
export async function saveDraft(
  input: Partial<CreateTicketInput> & {
    victimDetails: { name: string; contactNumber: string };
    categoryDetails: { category: string; subCategory: string };
  }
) {
  try {
    const data = await apiClient.post<{ success: boolean; complaintId: string }>(
      '/api/tickets/draft',
      input
    );
    return { success: true, complaintId: data.complaintId };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to save draft';
    return { error: message, success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// updateTicketDisposition
// Now calls: PATCH /api/tickets/:id/disposition
// ─────────────────────────────────────────────────────────────────────────────
export async function updateTicketDisposition(ticketId: string, disposition: string) {
  try {
    await apiClient.patch(`/api/tickets/${ticketId}/disposition`, { disposition });
    return { success: true };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to update disposition';
    return { error: message, success: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getMyTickets
// Now calls: GET /api/tickets/my
// ─────────────────────────────────────────────────────────────────────────────
export async function getMyTickets() {
  try {
    const data = await apiClient.get<{ tickets: unknown[] }>('/api/tickets/my');
    return { tickets: data.tickets };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to fetch tickets';
    return { error: message, tickets: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getAllTickets
// Now calls: GET /api/tickets with optional query params
// Role scoping is enforced by the backend (L2/L3 only via RBAC).
// ─────────────────────────────────────────────────────────────────────────────
export async function getAllTickets(filters?: {
  status?: string;
  isGoldenHour?: boolean;
  fromDate?: string;
  toDate?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.status)                    params.set('status', filters.status);
  if (filters?.isGoldenHour !== undefined) params.set('isGoldenHour', String(filters.isGoldenHour));
  if (filters?.fromDate)                  params.set('fromDate', filters.fromDate);
  if (filters?.toDate)                    params.set('toDate', filters.toDate);

  const query = params.toString() ? `?${params.toString()}` : '';

  try {
    const data = await apiClient.get<{ tickets: unknown[] }>(`/api/tickets${query}`);
    return { tickets: data.tickets };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to fetch tickets';
    return { error: message, tickets: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// searchTickets
// Now calls: GET /api/tickets/search
// ─────────────────────────────────────────────────────────────────────────────
export async function searchTickets(filters: {
  mobileNumber?: string;
  nccrpNumber?: string;
  complaintNumber?: string;
  district?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (val) params.set(key, val);
  });

  try {
    const data = await apiClient.get<{ tickets: unknown[] }>(
      `/api/tickets/search?${params.toString()}`
    );
    return { tickets: data.tickets };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Failed to search tickets';
    return { error: message, tickets: [] };
  }
}
