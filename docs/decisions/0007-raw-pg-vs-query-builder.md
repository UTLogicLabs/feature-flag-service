# 0007. Raw `pg` over a query builder (Kysely) or ORM

Status: Accepted
Date: 2026-07-09

## Context
The schema is 4 tables, JSONB-heavy (`targeting_rules`, `rules`, `diff`), and
the project's ethos throughout `docs/ARCHITECTURE.md` is minimizing moving
parts. A query builder like Kysely gives type-safe query construction but
needs a codegen step to derive types from the schema; a full ORM adds a
mapping layer and migration-generation opinions this project doesn't need.

## Decision
Use raw `pg` with hand-written, parameterized SQL, wrapped in small repository
functions per table (`app/app/lib/repositories/*.server.ts`). No ORM, no
query builder.

## Consequences
- No codegen step to keep in sync with migrations; the SQL in a repository
  function is exactly the SQL that runs.
- JSONB columns are passed through as `JSON.stringify(...)` on write and typed
  at the repository function boundary on read — manual, but there are only
  three JSONB columns total.
- Query complexity growth (joins across more than a couple of tables) would be
  a signal to revisit this decision; not expected at this project's scope.
- Rejected: Kysely (codegen overhead disproportionate to 4 tables); a full ORM
  (Prisma/TypeORM) (adds a runtime + migration-generation layer that
  duplicates the already-adopted node-pg-migrate).
