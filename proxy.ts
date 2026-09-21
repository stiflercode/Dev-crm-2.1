// ─── proxy.ts ──────────────────────────────────────────────────────────────
// In the decoupled architecture, authentication & RBAC are handled client-side
// via <AuthProvider> / useAuth() and backend-side via Express verifyToken middleware.
// NextAuth proxy checks are no longer needed.
// ───────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/api/sse/:path*'],
};
