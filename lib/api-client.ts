// ─── lib/api-client.ts ─────────────────────────────────────────────────────
// Centralized fetch utility for communicating with the Express backend.
//
// Features:
//   ✅ Automatically attaches Authorization: Bearer <token> header
//   ✅ Typed ApiError for non-2xx responses
//   ✅ login() / logout() helpers that manage token lifecycle
//   ✅ TOKEN_STORAGE constant to switch between localStorage and httpOnly cookie
//
// ⚠️  APPSEC TEST POINT #7 — TOKEN STORAGE
// ─────────────────────────────────────────────────────────────────────────────
// Change TOKEN_STORAGE below to switch between storage strategies:
//
//   'localStorage'
//     → Token is readable by JavaScript → VULNERABLE to XSS token theft
//     → Good for testing: XSS → document.cookie / localStorage.getItem attacks
//
//   'cookie'
//     → Token stored in a cookie with httpOnly flag set server-side
//     → JavaScript CANNOT read the token → XSS cannot steal it
//     → But: now vulnerable to CSRF if CORS + SameSite are not configured
//     → Good for testing: CSRF with forged cross-origin requests
//
// ─────────────────────────────────────────────────────────────────────────────

'use client';

// 🔒 Change to 'cookie' to test CSRF-based attack chains instead
const TOKEN_STORAGE: 'localStorage' | 'cookie' = 'localStorage';

// The Express backend base URL. Update if running on a different host/port.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

const TOKEN_KEY = 'crm_access_token';

// ─── Token Management ─────────────────────────────────────────────────────────

/** Retrieve the stored JWT. Returns null if not present. */
function getToken(): string | null {
  if (typeof window === 'undefined') return null; // SSR guard

  if (TOKEN_STORAGE === 'localStorage') {
    return localStorage.getItem(TOKEN_KEY);
  }

  // cookie mode: read from a non-httpOnly cookie set by the server
  // Note: httpOnly cookies are NOT readable here — this reads a 'mirror'
  // cookie the server sets alongside the httpOnly one for JS awareness.
  const match = document.cookie.match(new RegExp(`(?:^|; )${TOKEN_KEY}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Persist the JWT after a successful login. */
function setToken(token: string): void {
  if (TOKEN_STORAGE === 'localStorage') {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    // Secure defaults: SameSite=Strict prevents CSRF from cross-origin forms.
    // ⚠️  APPSEC: Remove Secure or change SameSite to 'None' to weaken this.
    document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; SameSite=Strict; Secure`;
  }
}

/** Remove the stored JWT (logout). */
function clearToken(): void {
  if (TOKEN_STORAGE === 'localStorage') {
    localStorage.removeItem(TOKEN_KEY);
  } else {
    document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

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
 *   - JWT Authorization header injection
 *   - JSON serialization of request body
 *   - Typed ApiError on non-2xx responses
 */
async function apiFetch<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Automatically attach the JWT if present
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    // Include credentials so the browser sends cookies (needed for cookie storage mode)
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
 * Stores the returned JWT and returns the user object.
 */
export async function login(username: string, password: string): Promise<AuthUser> {
  const data = await apiFetch<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: { username, password },
  });
  setToken(data.token);
  return data.user;
}

/**
 * Clears the stored JWT and redirects to /login.
 */
export function logout(): void {
  clearToken();
  window.location.href = '/login';
}

/**
 * Fetch the current user's profile from the backend.
 * Throws ApiError(401) if token is missing or expired.
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
