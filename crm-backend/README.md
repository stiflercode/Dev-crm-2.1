# CRM-1930 Backend API

Standalone Express + Mongoose REST API for the CRM-1930 Cyber Helpline.  
Decoupled from the Next.js frontend for AppSec testing.

## Quick Start

```bash
cd crm-backend
npm install
npm run dev
# → http://localhost:8080
```

## Environment Variables (`.env`)

| Variable | Default | Notes |
|---|---|---|
| `MONGODB_URI` | `CHANGE_ME` | Falls back to in-memory MongoDB in dev |
| `JWT_SECRET` | `CHANGE_ME` | **Must** be a long random string in production |
| `JWT_EXPIRES_IN` | `12h` | Token lifetime |
| `FRONTEND_ORIGIN` | `http://localhost:3000` | CORS allowed origin |
| `PORT` | `8080` | Server port |

## Endpoints

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | None | Issue JWT |
| GET | `/api/auth/oauth` | None | Start OAuth flow |
| GET | `/api/auth/callback` | None | OAuth callback |
| GET | `/api/auth/me` | Bearer | Current user |

### Tickets
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/tickets` | Bearer | List (role-scoped) |
| POST | `/api/tickets` | Bearer | Create ticket |
| GET | `/api/tickets/my` | Bearer | My tickets |
| GET | `/api/tickets/search` | Bearer | Search |
| PATCH | `/api/tickets/:id/disposition` | Bearer | Update disposition |
| POST | `/api/tickets/draft` | Bearer | Save draft |

### Users (L3 only)
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/users` | Bearer + L3 | List users |
| POST | `/api/users` | Bearer + L3 | Create user |
| PATCH | `/api/users/:id/toggle` | Bearer + L3 | Toggle active |
| PATCH | `/api/users/:id/password` | Bearer + L3 | Reset password |

## AppSec Test Points

| # | Location | Misconfiguration |
|---|---|---|
| 1 | `src/server.js` | Change CORS `origin` to `'*'` |
| 2 | `src/middleware/verifyToken.js` | Replace `jwt.verify()` with `jwt.decode()` |
| 3 | `src/routes/users.js` | Remove `requireRole('L3')` |
| 4 | `src/routes/auth.js` | Comment out state validation in `/callback` |
| 5 | `src/routes/auth.js` | Return distinct error messages in `/login` |
| 6 | `src/routes/tickets.js` | Remove `registeredBy` filter for L1 in `/search` |

## Default Test Credentials

| Role | Username | Password |
|---|---|---|
| L3 Admin | `admin` | `Admin@1930` |
| L2 Officer | `officer.sharma` | `Officer@123` |
| L1 Analyst | `analyst.priya` | `Analyst@123` |
