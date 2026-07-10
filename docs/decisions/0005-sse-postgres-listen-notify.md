# 0005. SSE + Postgres LISTEN/NOTIFY for real-time push (no Redis)

Status: Accepted
Date: 2026-07-09

## Context
Flag changes need to propagate to connected SDK clients within about a
second, without a page reload, and without adding a second infrastructure
dependency (Redis pub/sub, a message queue) purely for fan-out.

## Decision
A trigger on `flags` (`flags_notify_change`) fires `pg_notify('flag_changes', ...)`
on every insert/update. Each API process holds one dedicated, long-lived `pg.Client`
(not a pool connection — pool connections get recycled/closed, which would silently
drop the LISTEN) running `LISTEN flag_changes`, guarded by a module-level global so
Remix dev-server HMR doesn't spawn duplicate LISTEN connections. On notification,
the process iterates its own in-memory SSE registry (`Map<connectionId, {...}>`),
re-evaluates the flag map for each registered client whose environment matches,
and pushes the full new `FlagMap` if it differs from the client's last-sent map.
Each SSE connection sends the full flag map, both on connect and on every
subsequent diff-triggered push (the diff check only decides *whether* to push,
not what to send).

## Consequences
- No Redis/queue dependency: `NOTIFY` fans out to every `LISTEN`ing connection
  across processes automatically, and each process only needs to manage its
  own locally-connected SSE clients — no cross-instance client registry.
- Horizontal scaling of the API is correct as-is: every instance gets every
  NOTIFY, only pushes to its own local clients.
- Two explicit limits that would force reconsideration: NOTIFY's 8000-byte
  payload cap (the payload here is just `{key, environment}`, well under it),
  and cross-region fanout (Postgres LISTEN/NOTIFY doesn't span regions).
- Rejected: Redis pub/sub (extra infra for no benefit at this scale); polling
  from clients (higher latency, more load).
