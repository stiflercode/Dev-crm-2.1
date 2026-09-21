// ─── app/api/reports/export-csv/route.ts ───────────────────────────────────
// This Next.js API route has been migrated to the Express backend.
// It now proxies the request to GET /api/reports/export-csv on port 8080,
// forwarding the Authorization header so the backend can verify the JWT.
// ───────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');

  const backendRes = await fetch(`${API_BASE}/api/reports/export-csv`, {
    headers: {
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
  });

  if (!backendRes.ok) {
    const body = await backendRes.json().catch(() => ({ error: 'Backend error' }));
    return NextResponse.json(body, { status: backendRes.status });
  }

  const csv = await backendRes.text();
  const disposition = backendRes.headers.get('content-disposition') ?? 'attachment; filename="report.csv"';

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': disposition,
      'Cache-Control': 'no-store',
    },
  });
}