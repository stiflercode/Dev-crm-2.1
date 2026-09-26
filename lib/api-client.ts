// ─── lib/api-client.ts ─────────────────────────────────────────────────────
// Centralized fetch utility for communicating with the Express backend.
//
// 🔒 SECURITY MODEL — HttpOnly Cookie (Enterprise Standard)
// ─────────────────────────────────────────────────────────────────────────────
//
//   ┌─────────────────────────────────────────────────────────────────────┐
//   │  [ Attacker ] ──► injects XSS into Ticket form                      │
//   │  [ Browser  ] ──► script tries document.cookie / localStorage       │
//   │  [ Browser  ] ──► ❌ BLOCKED — HttpOnly flag prevents JS access     │
//   │  [ Backend  ] ──► crm_token cookie sent automatically by browser    │
//   │                   and VERIFIED server-side — XSS attack is defeated │
//   └─────────────────────────────────────────────────────────────────────┘
//
// How it works:
//   1. POST /api/auth/login  → server sets HttpOnly; Secure; SameSite=Strict cookie
//   2. Every apiFetch call   → browser attaches the cookie automatically
//                              (credentials: 'include') — NO JS token handling
//   3. POST /api/auth/logout → server calls res.clearCookie() — cookie gone
//
// What was removed vs the old localStorage model:
//   ✂️  TOKEN_STORAGE constant       — no longer needed
//   ✂️  getToken() / setToken() / clearToken()  — no longer needed
//   ✂️  Authorization: Bearer header injection  — cookie replaces it
//
// ─────────────────────────────────────────────────────────────────────────────

'use client';

// The Express backend base URL. Update if running on a different host/port.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

// ─── Typed Error ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Core Fetch Wrapper ───────────────────────────────────────────────────────

interface RequestOptions extends Omit<RequestInit, 'body'> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: any;
}

/**
 * apiFetch — wraps the native fetch() API with:
 *   - Automatic base URL prepending
 *   - credentials: 'include' so the browser sends the HttpOnly crm_token cookie
 *   - JSON serialization of request body
 *   - Typed ApiError on non-2xx responses
 *
 * NOTE: No Authorization header is injected here. Authentication is handled
 * entirely by the HttpOnly cookie — JavaScript never touches the token.
 */
async function apiFetch<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    // 🔒 credentials: 'include' tells the browser to attach the HttpOnly
    // crm_token cookie on every cross-origin request to the Express backend.
    // Without this flag, the cookie would be silently omitted.
    credentials: 'include',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    let errorBody: unknown;
    try {
      errorBody = await response.json();
    } catch {
      errorBody = { error: response.statusText };
    }
    const message = (errorBody as { error?: string })?.error ?? `HTTP ${response.status}`;
    throw new ApiError(response.status, message, errorBody);
  }

  // Handle 204 No Content
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

// ─── Auth Helpers ─────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  role: 'L1' | 'L2' | 'L3';
  extension: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

/**
 * Login with username + password.
 *
 * The backend sets the HttpOnly crm_token cookie via Set-Cookie header.
 * The frontend never sees or stores the token — the browser manages it.
 */
export async function login(username: string, password: string): Promise<AuthUser> {
  const data = await apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: { username, password },
  });
  // ✅ No setToken() call needed — the server already set the HttpOnly cookie.
  return data.user;
}

/**
 * Logout — calls the backend to clear the HttpOnly cookie server-side,
 * then redirects to /login.
 *
 * Why we call the backend instead of just clearing client-side:
 *   The crm_token cookie has httpOnly: true — JavaScript CANNOT delete it.
 *   Only the server can issue a Set-Cookie with an expired date to clear it.
 */
export async function logout(): Promise<void> {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // Swallow errors (e.g. network down) — we still redirect to /login.
  } finally {
    window.location.href = '/login';
  }
}

/**
 * Fetch the current user's profile from the backend.
 * The HttpOnly cookie is sent automatically by the browser.
 * Throws ApiError(401) if the cookie is missing or the JWT is expired.
 */
export async function getCurrentUser(): Promise<AuthUser> {
  const data = await apiFetch<{ user: AuthUser }>('/api/auth/me');
  return data.user;
}

// ─── Resource Methods ─────────────────────────────────────────────────────────

/** Typed shorthand methods for common HTTP verbs */
export const apiClient = {
  get: <T = unknown>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { method: 'GET', ...options }),

  post: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { method: 'POST', body, ...options }),

  patch: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { method: 'PATCH', body, ...options }),

  put: <T = unknown>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { method: 'PUT', body, ...options }),

  delete: <T = unknown>(path: string, options?: RequestOptions) =>
    apiFetch<T>(path, { method: 'DELETE', ...options }),

  // Auth shortcuts
  login,
  logout,
  getCurrentUser,
};

export default apiClient;
