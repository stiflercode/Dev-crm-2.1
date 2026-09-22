// ─── app/actions/monitor.ts ─────────────────────────────────────────────────
// Client-side actions for the Supervisor Monitoring Console.
// All endpoints require L3 role (enforced by backend RBAC).
// ────────────────────────────────────────────────────────────────────────────

import apiClient, { ApiError } from '@/lib/api-client';

// ── Types ──────────────────────────────────────────────────────────────────

export interface MonitorSummary {
  total: number;
  available: number;
  onCall: number;
  onBreak: number;
  wrapUp: number;
  offline: number;
  slaBreached: number;
  totalTickets: number;
  totalTalkSec: number;
}

export interface HourlyBucket { hour: number; count: number; }

export interface LoginLogEntry {
  agentId: string;
  name: string;
  username: string;
  role: string;
  extension: string;
  loginTime: string;
  logoutTime: string | null;
  isOnline: boolean;
  durationSec: number;
  ticketsRegistered: number;
  currentStatus: string;
  totalTalkSec: number;
  breakCount: number;
}

export interface CallLogEntry {
  id: string;
  complaintId: string;
  callDate: string;
  agentName: string;
  agentUsername: string;
  extension: string;
  role: string;
  phoneNumber: string;
  disposition: string | null;
  status: string;
  isGoldenHour: boolean;
  fraudAmount: number;
  category: string;
  subCategory: string;
}

export interface CallLogFilters {
  startDate?: string;
  endDate?: string;
  extension?: string;
  agentUsername?: string;
  disposition?: string;
  phone?: string;
}

// ── Actions ────────────────────────────────────────────────────────────────

export async function getMonitorSummary() {
  try {
    const data = await apiClient.get<MonitorSummary>('/api/agents/monitor/summary');
    return { data };
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to load summary' };
  }
}

export async function getHourlyActivity() {
  try {
    const data = await apiClient.get<{ buckets: HourlyBucket[] }>('/api/agents/monitor/hourly-activity');
    return { buckets: data.buckets };
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to load hourly data', buckets: [] };
  }
}

export async function getLoginLog() {
  try {
    const data = await apiClient.get<{ log: LoginLogEntry[] }>('/api/agents/login-log');
    return { log: data.log };
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to load login log', log: [] };
  }
}

export async function forceLogoutAgent(agentId: string) {
  try {
    const data = await apiClient.post<{ success: boolean; message: string }>(
      `/api/agents/${agentId}/force-logout`
    );
    return { success: true, message: data.message };
  } catch (err) {
    return { success: false, error: err instanceof ApiError ? err.message : 'Force logout failed' };
  }
}

export async function getCallLog(filters: CallLogFilters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.startDate)    params.set('startDate', filters.startDate);
    if (filters.endDate)      params.set('endDate', filters.endDate);
    if (filters.extension)    params.set('extension', filters.extension);
    if (filters.agentUsername) params.set('agentUsername', filters.agentUsername);
    if (filters.disposition)  params.set('disposition', filters.disposition);
    if (filters.phone)        params.set('phone', filters.phone);

    const qs = params.toString();
    const data = await apiClient.get<{ calls: CallLogEntry[] }>(`/api/agents/call-log${qs ? `?${qs}` : ''}`);
    return { calls: data.calls };
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to load call log', calls: [] };
  }
}
