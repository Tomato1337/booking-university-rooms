# AGENTS.md — Booking University Rooms

Monorepo: `frontend/` (React SPA) + `backend/` (Go API) + `postgres` (Docker).

## Repo Structure

```
frontend/          → React 19 + Vite 8 + Reatom v1000 + shadcn/ui (see frontend/AGENTS.md)
backend/           → Go 1.25 + Gin + pgx/v5 + golang-jwt/v5
  cmd/api/         → entrypoint (main.go)
  internal/        → config, db, handlers, middleware, models, services, utils
  migrations/      → SQL migrations (000001_init.sql)
docs/              → backend-api-spec.md (RU), openapi.yaml (OpenAPI 3.1.0)
docker-compose.yml → frontend (nginx:5173), backend (:3000), postgres (17-alpine)
```

## Quick Start

```bash
# Docker (full stack)
docker compose up --build          # requires .env with secrets below

# Backend dev
cd backend && go run ./cmd/api     # needs running postgres + env vars

# Frontend dev
cd frontend && pnpm dev            # Vite dev server, see frontend/AGENTS.md for build
```

## Required Environment Variables

| Variable              | Where         | Notes                          |
|-----------------------|---------------|--------------------------------|
| `POSTGRES_PASSWORD`   | .env (root)   | shared by docker-compose       |
| `JWT_SECRET`          | .env (root)   | access token signing           |
| `JWT_REFRESH_SECRET`  | .env (root)   | refresh token signing          |
| `DATABASE_URL`        | backend/.env  | `postgres://user:pass@host:5432/db?sslmode=disable` |
| `SERVER_PORT`         | backend/.env  | default 3000                   |

See `backend/.env.example` for full list with defaults.

## Backend Key Facts

- **API base path**: `/api` (no version prefix in current implementation; spec recommends `/api/v1`)
- **Auth**: JWT access token (header) + refresh token (httpOnly cookie). Token rotation on refresh.
- **Roles**: `student`, `admin`. Role checked via middleware.
- **Booking model**: Optimistic — overlapping `pending` bookings allowed, overlapping `confirmed` forbidden.
- **Cascade auto-cancel**: When a booking is approved, conflicting `pending` bookings for the same room+time are auto-rejected in a SERIALIZABLE transaction.
- **Pagination**: Cursor-based (`?cursor=<id>&limit=N`).
- **Rate limiting**: In-memory, per-IP.
- **DB migrations**: Run automatically on startup (`migrations/` dir, embedded via Go embed).

## Database Schema (core tables)

```
users       → id, email, password_hash, full_name, role, created_at, updated_at
rooms       → id, name, description, capacity, location, has_projector, has_whiteboard, is_active
bookings    → id, user_id, room_id, title, description, start_time, end_time, status, admin_comment
```

`bookings.status`: `pending` → `confirmed` | `rejected` | `cancelled`

Unique constraint: no two `confirmed` bookings can overlap for the same room (enforced by exclusion constraint + app logic).

## API Endpoints Overview

| Method | Path                         | Auth     | Purpose                    |
|--------|------------------------------|----------|----------------------------|
| POST   | /api/auth/register           | —        | Register new user          |
| POST   | /api/auth/login              | —        | Login, returns tokens      |
| POST   | /api/auth/refresh            | cookie   | Rotate refresh token       |
| POST   | /api/auth/logout             | cookie   | Clear refresh cookie       |
| GET    | /api/rooms                   | student+ | List rooms (filterable)    |
| GET    | /api/rooms/:id               | student+ | Room details               |
| GET    | /api/rooms/:id/availability  | student+ | Time slot availability     |
| POST   | /api/bookings                | student+ | Create booking             |
| GET    | /api/bookings                | student+ | My bookings (student) or all (admin) |
| GET    | /api/bookings/:id            | student+ | Booking details            |
| PATCH  | /api/bookings/:id/cancel     | owner    | Cancel own booking         |
| PATCH  | /api/bookings/:id/status     | admin    | Approve/reject booking     |
| POST   | /api/admin/rooms             | admin    | Create room                |
| PUT    | /api/admin/rooms/:id         | admin    | Update room                |
| DELETE | /api/admin/rooms/:id         | admin    | Soft-delete room           |

Full details: `docs/openapi.yaml`

## Cross-Cutting Concerns

- **Spec vs implementation**: `docs/backend-api-spec.md` recommends Node.js/Fastify — actual implementation is Go/Gin. Treat the spec as requirements doc, not tech blueprint.
- **Docker networking**: `frontend-net` (frontend↔backend), `backend-net` (backend↔postgres). Backend bridges both.
- **Frontend instructions**: See `frontend/AGENTS.md` — covers code style, Reatom patterns, FEOD architecture, component conventions, design system. Do NOT duplicate here.
