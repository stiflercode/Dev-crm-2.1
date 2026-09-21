import { NextRequest, NextResponse } from 'next/server';

// In-memory SSE client registry (works for single-instance; upgrade to Redis pub/sub for multi-instance)
const clients = new Set<ReadableStreamDefaultController>();

function sendToAllClients(data: object) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  clients.forEach((controller) => {
    try {
      controller.enqueue(new TextEncoder().encode(message));
    } catch {
      clients.delete(controller);
    }
  });
}

// GET — SSE subscription endpoint for L2/L3 browsers
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      clients.add(controller);

      // Send heartbeat comment to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          clearInterval(heartbeat);
          clients.delete(controller);
        }
      }, 25000);

      // Send welcome event
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`)
      );

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        clients.delete(controller);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// POST — internal endpoint called by Server Action to push golden hour alerts
export async function POST(request: NextRequest) {
  const internalKey = request.headers.get('x-internal-key');
  if (internalKey !== (process.env.INTERNAL_API_KEY || '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await request.json();

    const alert = {
      type: 'GOLDEN_HOUR_ALERT',
      id: `gh_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ...body,
      pushedAt: new Date().toISOString(),
    };

    sendToAllClients(alert);

    return NextResponse.json({ success: true, clientCount: clients.size });
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
