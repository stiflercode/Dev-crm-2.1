// ─── server.js ─────────────────────────────────────────────────────────────
// Express entry point for the CRM-1930 backend API.
// Runs on port 8080. All routes are mounted under /api.
// ───────────────────────────────────────────────────────────────────────────

'use strict';

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import connectDB from './config/db.js';
import authRouter from './routes/auth.js';
import ticketsRouter from './routes/tickets.js';
import usersRouter from './routes/users.js';
import lienRouter from './routes/lien.js';
import agentsRouter from './routes/agents.js';
import reportsRouter from './routes/reports.js';

// ─── Startup Guards ───────────────────────────────────────────────────────────
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('CHANGE_ME')) {
  console.error('❌  FATAL: JWT_SECRET is not set or is a placeholder. Set a real secret in .env');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 8080;

// ─── Security Headers (Helmet) ────────────────────────────────────────────────
// Sets X-Frame-Options, X-Content-Type-Options, X-DNS-Prefetch-Control, etc.
// Must be first middleware.
app.use(
  helmet({
    // Relax CSP for local dev — tighten in production
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
    crossOriginEmbedderPolicy: false,
  })
);

// ─── Global Rate Limiting ─────────────────────────────────────────────────────
// Broad limiter: 200 req / 15 min per IP (covers all /api/* routes)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// Strict login limiter: 20 attempts / 15 min per IP
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' },
  skipSuccessfulRequests: true, // only count failed attempts
});

app.use('/api', globalLimiter);

// ─── Database (lazy per-request) ─────────────────────────────────────────────
// connectDB is NOT called at startup — the server boots instantly.
// The first API request triggers the connection (and Atlas IP check).
async function dbMiddleware(req, res, next) {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('❌  DB connection error:', err.message);
    res.status(503).json({
      error: 'Database unavailable. Check server logs.',
    });
  }
}

// ─── CORS Configuration (Must be first) ──────────────────────────────────────
// credentials:true requires an explicit origin — wildcards are rejected by browsers.
// ⚠️  APPSEC: Change ALLOWED_ORIGIN to '*' to simulate a misconfigured open CORS policy.
const ALLOWED_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
app.use(
  cors({
    origin: ALLOWED_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    // credentials:true is REQUIRED so the browser sends the HttpOnly cookie
    // on cross-port requests (Next.js :3000 ↔ Express :8080).
    credentials: true,
  })
);

// ─── Core Middleware ─────────────────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
// cookieParser MUST come before any route that reads req.cookies.
// This is what makes the HttpOnly 'crm_token' cookie available to verifyToken.
app.use(cookieParser());

// ─── Routes ──────────────────────────────────────────────────────────────────
// All routes go through dbMiddleware so DB connects on first real request.
// loginLimiter is applied ONLY to the login endpoint (strict brute-force guard).
app.use('/api/auth',    dbMiddleware, authRouter);
app.use('/api/tickets', dbMiddleware, ticketsRouter);
app.use('/api/users',   dbMiddleware, usersRouter);
app.use('/api/lien',    dbMiddleware, lienRouter);
app.use('/api/agents',  dbMiddleware, agentsRouter);
app.use('/api/reports', dbMiddleware, reportsRouter);

// ─── Health Check & Root Info ────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    name: '1930 Cyber Helpline CRM - Backend API',
    status: 'online',
    frontend: 'http://localhost:3000',
    docs: {
      health: 'http://localhost:8080/api/health',
      auth: 'http://localhost:8080/api/auth',
      tickets: 'http://localhost:8080/api/tickets',
      users: 'http://localhost:8080/api/users',
      reports: 'http://localhost:8080/api/reports'
    }
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('❌ Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 CRM-1930 Backend API running on http://localhost:${PORT}`);
  console.log(`   Health:  http://localhost:${PORT}/api/health`);
  console.log(`   CORS origin: ${process.env.FRONTEND_ORIGIN || 'http://localhost:3000'}\n`);
});
