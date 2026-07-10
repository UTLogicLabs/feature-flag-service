# 0001. Auth & RBAC approach for admin UI

Status: Accepted
Date: 2026-07-09

## Context
`docs/ARCHITECTURE.md` left auth/RBAC as an explicit open item. The audit log
needs a real actor identity (not a shared password or anonymous access) to be
meaningful for rollbacks and incident review, and different admin actions
(view vs. mutate flags vs. manage users) warrant different levels of access.

## Decision
Full user accounts: `email` + bcrypt `password_hash` (12 rounds) in a `users`
table, no self-registration (admins create accounts via `/app/users`). Three
roles, ranked `viewer < editor < admin`:
- `viewer`: read-only across flags, segments, audit log.
- `editor`: create/edit/toggle flags, create/edit segments. Cannot manage users.
- `admin`: everything editor can do, plus manage users (create, deactivate, change role).

Sessions are Remix cookie sessions (see ADR 0006). `requireUser` and
`requireRole` in `app/app/lib/auth.server.ts` are the single enforcement point
used by every protected loader/action, both UI and JSON API routes.

## Consequences
- The audit log's `actor`/`actor_user_id` columns have a real, attributable
  identity for every write.
- A three-role model matches the natural read/write/manage-users split
  without a general-purpose permissions matrix that this project doesn't need.
- Deactivation is a soft-delete (`is_active` boolean) rather than a hard
  delete, so `audit_log.actor_user_id`'s FK and history survive account removal.
- Rejected: shared admin password (no per-actor attribution); no-auth admin
  UI (unacceptable for a tool that can kill production flags).
