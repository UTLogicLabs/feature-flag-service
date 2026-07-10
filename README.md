# Feature Flag Service

A minimal, self-hosted feature flag service — a stripped-down LaunchDarkly. Percentage
rollouts, user/segment targeting, real-time push to connected clients over SSE, and an
audit log.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design and
[docs/decisions/](docs/decisions/) for the rationale behind individual choices (ADRs).

## Stack

- **API / Admin UI**: Remix (Vite) + Tailwind
- **DB**: Postgres (targeting rules as JSONB)
- **Real-time**: SSE, pushed via Postgres `LISTEN`/`NOTIFY` — no Redis/message queue
- **Client SDK**: vanilla TS, zero deps, <2KB gzipped (`packages/sdk`)

## Requirements

- Node.js 20+
- Docker (for the Postgres dev/test containers)

## Setup

```bash
npm install
docker compose up -d          # starts dev + test Postgres

cp .env.example .env          # if present, otherwise create manually — see below
cp .env.example app/.env      # Vite loads .env from app/, not the repo root

npm run migrate               # migrate the dev database
npm run migrate:test          # migrate the test database
```

`.env` (repo root) and `app/.env` (used by the Remix dev server) both need:

```
DATABASE_URL=postgres://feature_flags:feature_flags@localhost:5433/feature_flags
SESSION_SECRET=dev-secret-change-me
PORT=3000
```

`.env.test` needs the same, pointed at the test database/port from `docker-compose.yml`.

## Development

```bash
npm run dev
```

Starts the Remix dev server (Vite picks an available port, e.g. `http://localhost:5173`
or the next free port if that's taken).

There's no self-registration — admin users are created directly in the database. To seed
one, hash a password with bcrypt and insert a row into `users` with `role = 'admin'`.

## Testing

```bash
npm test                 # unit tests (evaluation engine, hashing, SDK) — no DB required
npm run test:integration # integration tests against the real Postgres test DB
```

## Building

```bash
npm run build             # builds the Remix app and the SDK
npm run sdk:build          # builds just the SDK (packages/sdk/dist)
npm run sdk:size-check     # fails if the gzipped SDK bundle exceeds 2KB
```

## Project layout

```
app/                  Remix app (admin UI + API + evaluation engine)
packages/sdk/         Client SDK (EventSource-based, cache + backoff, outage fallback)
db/migrations/        Dated SQL migrations (node-pg-migrate, SQL mode)
docs/ARCHITECTURE.md  Design spec and rationale
docs/decisions/       ADRs — one per non-obvious architectural decision
```
