'use client';

// ─── lib/auth-context.tsx ──────────────────────────────────────────────────
// React context that replaces NextAuth's useSession() + SessionProvider.
//
// Usage:
//   1. Wrap your root layout with <AuthProvider>
//   2. In any client component: const { user, isLoading, logout } = useAuth()
//
// The provider reads the JWT on mount, calls GET /api/auth/me to validate it,
// and exposes the decoded user. On 401, it clears the token automatically.
// ───────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import apiClient, { AuthUser, ApiError } from './api-client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuthContextValue {
  /** The currently authenticated user, or null if unauthenticated */
  user: AuthUser | null;
  /** Epoch seconds of when the user logged in (from JWT iat) */
  loginTimestamp: number | null;
  /** True while the initial token validation is in flight */
  isLoading: boolean;
  /** Call after a successful login to set the user without a full page reload */
  setUser: (user: AuthUser | null) => void;
  /** Clear token + redirect to /login */
  logout: () => void;
  /** Re-fetch the user from the backend */
  refresh: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loginTimestamp, setLoginTimestamp] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const currentUser = await apiClient.getCurrentUser();
      setUser(currentUser);
      // Record login time once — Math.floor(Date.now()/1000) at the moment
      // the token is validated so timers start from the correct origin.
      setLoginTimestamp((prev) => prev ?? Math.floor(Date.now() / 1000));
    } catch (err) {
      // 401 means token is missing, expired, or invalid — clear and stay on page
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
      } else {
        console.error('[AuthProvider] Unexpected error fetching user:', err);
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Validate token on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loginTimestamp,
        isLoading,
        setUser,
        logout: () => { apiClient.logout(); },
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * useAuth() — drop-in replacement for NextAuth's useSession()
 *
 * @example
 * const { user, isLoading, logout } = useAuth();
 * if (isLoading) return <Spinner />;
 * if (!user) redirect('/login');
 * return <p>Hello, {user.name} ({user.role})</p>;
 */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() must be used inside <AuthProvider>. Did you forget to wrap your layout?');
  }
  return ctx;
}

export default AuthProvider;
