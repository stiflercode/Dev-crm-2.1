// ─── app/api/auth/[...nextauth]/route.ts ───────────────────────────────────
// NextAuth has been REMOVED from this project.
// Authentication is now handled by the standalone Express backend on port 8080.
//
// This file is kept as a placeholder to avoid "Route not found" errors if any
// remaining code still navigates to /api/auth/*. Remove it once all callers
// have been migrated to use apiClient from @/lib/api-client.
// ───────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    { error: 'NextAuth has been removed. Use the Express backend at /api/auth on port 8080.' },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: 'NextAuth has been removed. Use the Express backend at /api/auth on port 8080.' },
    { status: 410 }
  );
}
