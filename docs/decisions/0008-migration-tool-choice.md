# 0008. Migration tool: node-pg-migrate in SQL mode, dated filenames

Status: Accepted
Date: 2026-07-09

## Context
The schema is 4 tables plus a couple of enum/trigger additions, all raw SQL by
project ethos (see ADR 0007). We need migration tracking (which migrations have
run against a given DB) and up/down pairs, without pulling in a full ORM or
adopting a JS-wrapper migration DSL that would be the only non-SQL part of the
data layer.

## Decision
Use `node-pg-migrate` with plain SQL migration files rather than its default
JS wrapper mode (`pgm.sql(...)`). Filenames are date-prefixed and kebab-cased:
`db/migrations/YYYY-MM-DD-title-kebab-case.sql`.

Correction made during implementation: `node-pg-migrate`'s actual SQL-mode
convention (verified against the installed 7.9.1) is **one file per
migration**, containing both directions separated by `-- Up Migration` /
`-- Down Migration` comment markers — not the `<name>.up.sql` / `<name>.down.sql`
file-pair convention originally sketched in the implementation plan. Its
`--migration-file-language sql` flag only affects the `create` action (which
migration-file stub to scaffold), not how the `up`/`down` runner loads
existing files; every file present in `migrations-dir` is loaded independently,
so pairing by filename suffix isn't a thing this tool does. Migrations were
restructured to the single-file-with-markers format so `up`/`down` behave
correctly.

## Consequences
- One dependency gives a migrations-tracking table (`pgmigrations`) for free,
  applied consistently to both the dev and test databases.
- Files stay plain SQL, easy to read/diff, consistent with the rest of the
  project having no ORM. Up and down live in the same file, which is a
  reasonable tradeoff for a file that's still all raw SQL and diffs as one unit.
- Filenames sort chronologically without needing a separate numeric sequence
  counter, at the cost of needing to remember to bump the date per new file.
- Rejected: hand-written numbered SQL + a custom runner (reinvents tracking
  logic for no benefit); node-pg-migrate's default JS mode (adds a JS
  indirection layer for what is otherwise 100% raw SQL); the originally-planned
  `.up.sql`/`.down.sql` file-pair convention (not actually how this tool loads
  migrations).
