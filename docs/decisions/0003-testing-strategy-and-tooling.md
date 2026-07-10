# 0003. Testing strategy & tooling (Vitest + docker-compose Postgres for integration)

Status: Accepted
Date: 2026-07-09

## Context
The evaluation engine is pure and needs fast unit tests with no infrastructure.
The rest of the system (CRUD routes, RBAC, SSE push, audit-log transactions)
depends on real Postgres behavior — `gen_random_uuid()` (pgcrypto), JSONB
operators, triggers, and LISTEN/NOTIFY — none of which in-memory fakes like
pg-mem faithfully emulate, and testcontainers would add a Docker-in-Docker
dependency on top of the docker-compose Postgres already used for local dev.

## Decision
Vitest for both unit and integration tests, configured as three projects in
one root `vitest.config.ts`: `unit` (no DB, `app/tests/unit`), `integration`
(real Postgres via `docker-compose`'s `postgres_test` service, `app/tests/integration`),
and `sdk` (jsdom environment, `packages/sdk/tests`). Integration tests migrate
the `feature_flags_test` database fresh via a `beforeAll` hook
(`app/tests/integration/setup.ts`) and `TRUNCATE ... RESTART IDENTITY CASCADE`
all tables in a `beforeEach` hook — much faster than a per-test container
restart. Integration tests call route `loader`/`action` functions directly
with hand-built `Request` objects (and a session cookie built via
`sessionStorage.commitSession`) rather than spinning up a full HTTP server,
since Remix's loaders/actions are plain functions over Web `Request`/`Response`.
Integration test files run with `fileParallelism: false` since they share one
truncated database.

## Consequences
- Real Postgres features (LISTEN/NOTIFY, triggers, pgcrypto, unique
  constraints) are exercised faithfully — the audit-log transaction rollback
  test and the SSE push test would not be meaningful against a fake.
- One docker-compose file serves both local dev and integration testing,
  avoiding a second DB-provisioning mechanism.
- Truncate-between-tests keeps the suite fast without needing a fresh
  container per test.
- Rejected: pg-mem (doesn't implement LISTEN/NOTIFY or triggers faithfully);
  testcontainers (slower cold start, extra Docker-in-Docker dependency on top
  of a compose file already required for dev).
