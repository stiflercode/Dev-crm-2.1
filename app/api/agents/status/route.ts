// ─── app/api/agents/status/route.ts ────────────────────────────────────────
// Proxies to GET /api/agents/roster on the Express backend.
// The old version called auth() + getAgentRosterForToday() directly.
// Now it forwards the Authorization header to the backend for JWT verification.
// ───────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');

  const backendRes = await fetch(`${API_BASE}/api/agents/roster`, {
    headers: {
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
  });

  const body = await backendRes.json().catch(() => ({ error: 'Backend error' }));
  return NextResponse.json(body, { status: backendRes.status });
}
