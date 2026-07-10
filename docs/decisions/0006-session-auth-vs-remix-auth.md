# 0006. Session library choice: hand-rolled Remix cookie sessions over remix-auth

Status: Accepted
Date: 2026-07-09

## Context
The admin UI has exactly one credential type (email + password) against one
`users` table. `remix-auth` provides a strategy abstraction that shines when
supporting multiple auth methods (OAuth providers, magic links, credentials,
etc.) behind a common interface.

## Decision
Use Remix's built-in `createCookieSessionStorage` directly, plus bcrypt for
password hashing, with `requireUser`/`requireRole` loader helpers hand-written
in `app/app/lib/auth.server.ts` (~80 lines).

## Consequences
- The entire auth surface area is auditable in one file, with no strategy
  indirection to trace through for a single credential type.
- Adding a second auth method later (OAuth, SSO) would be a real migration,
  not a config change — accepted tradeoff, since there's no near-term need.
- Rejected: `remix-auth`, since its strategy abstraction is overhead for a
  single-strategy app.
