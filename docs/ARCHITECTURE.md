# Feature Flag Service — Architecture

A minimal, self-hosted feature flag service. Stripped-down LaunchDarkly: percentage
rollouts, segment/attribute targeting, real-time push to connected clients, audit log.

This doc is written to be handed to an AI coding agent (Claude Code, Cursor, etc.) as
the spec for implementation. It states decisions and rationale, not just requirements,
so an agent building from it doesn't have to re-derive the tradeoffs.

## Stack

- API: Node + Remix
- DB: Postgres (targeting rules as JSONB)
- Real-time: SSE, pushed via Postgres `LISTEN`/`NOTIFY` — no Redis/message queue
- Admin UI: Remix + Tailwind
- Client SDK: vanilla TS, <2kb, zero deps, ships evaluated flags only (not rules)

## Non-obvious decisions (read this before implementing)

- **No Redis pub/sub.** Postgres `NOTIFY` broadcasts to every session `LISTEN`ing on a
  channel, across processes, as long as each API instance holds one dedicated
  long-lived `pg` connection doing the `LISTEN`. This covers horizontal scaling of the
  API without an extra moving part. Only reach for Redis/a queue if you exceed
  `NOTIFY`'s 8000-byte payload or need cross-region fanout — don't add it preemptively.
- **The client SDK never receives targeting rules.** It receives only the resolved
  `{flagKey: variant}` map for the user context it connects with. Shipping raw rules to
  the browser leaks rollout logic and segment definitions via devtools.
- **Consistent-hash bucketing, not `Math.random()`.** Naive random bucketing reshuffles
  membership on every evaluation — a user flips in/out of a rollout across requests as
  the percentage changes. Hash `flagKey:userId` instead so a user's bucket is stable
  and rollout is monotonic (raising % only adds users, never removes them). This is the
  one genuinely nontrivial piece of the whole project — see below.
- **Audit log is written at the app layer, in the same transaction as the flag update**
  — not via a DB trigger. Triggers can't see the authenticated actor without threading
  it through `SET LOCAL app.current_user` on every write, which is more moving parts
  than just logging the diff in the request handler.
- **Outage fallback default is "stay as you were," not "fall back to `default_variant`."**
  On SSE disconnect, the SDK should keep serving its last-known-good cached values, not
  silently revert to defaults — reverting can flip a flag the *opposite* direction of
  what an outage should do. Exception: a flag explicitly marked as a kill-switch should
  cache its kill state and always honor it, even offline.
- **Environments are a first-class column, not an afterthought.** `(key, environment)`
  is the actual unique constraint on flags. Bolting this on later means a migration and
  a very easy way to leak test flags into prod.

## Data model

```sql
create table flags (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  environment text not null,
  description text,
  enabled boolean not null default false,
  is_kill_switch boolean not null default false,
  default_variant jsonb not null default 'false',
  rollout_percentage smallint check (rollout_percentage between 0 and 100),
  targeting_rules jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  unique (key, environment)
);

create table segments (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  rules jsonb not null default '[]'
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  flag_key text not null,
  actor text not null,
  diff jsonb not null,
  created_at timestamptz not null default now()
);
```

Targeting rule shape (array in `targeting_rules`, evaluated in order, first match wins):

```ts
type Rule = {
  attribute: string
  operator: 'eq' | 'in' | 'gt' | 'lt' | 'contains'
  value: string | Array<string>
  variant: boolean | string
}
```

## Evaluation precedence

```
1. is_kill_switch === true         -> false, always, no other rule overrides this
2. enabled === false               -> default_variant
3. targeting_rules, in order       -> first match wins
4. rollout_percentage               -> consistent-hash bucket (below)
5. default_variant
```

## Consistent hashing

```ts
function fnv1a(str: string) {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function isInRollout(flagKey: string, userId: string, percentage: number) {
  const bucket = fnv1a(`${flagKey}:${userId}`) % 10000
  return bucket < percentage * 100
}
```

No dependencies, deterministic, stable per user. Same function should be reused
server-side (evaluation) — do not reimplement bucketing logic twice.

## Real-time push

1. Trigger on `flags` insert/update fires `NOTIFY flag_changes, '<payload>'`.
2. Each API instance holds one dedicated `pg` connection running `LISTEN flag_changes`.
3. On notify, the instance re-evaluates affected flags for each connected SSE client's
   cached user context and pushes the diff down that client's connection.
4. Client SDK: `EventSource`, reconnect with exponential backoff on drop, retain
   last-known-good values in memory for the duration of an outage.

## SDK contract

```ts
type FlagMap = Record<string, boolean | string>

function createFlagClient(context: Record<string, unknown>) {
  let cache: FlagMap = {}
  const source = new EventSource(`/flags/stream?context=${encodeURIComponent(JSON.stringify(context))}`)

  source.onmessage = (event) => {
    cache = JSON.parse(event.data)
  }

  return {
    isEnabled(key: string) {
      return Boolean(cache[key])
    },
  }
}
```

Server sends the full evaluated `FlagMap` on connect, then diffs on subsequent pushes.
The SDK ships zero evaluation logic — it's a cache and an event listener, nothing more.

## Audit log

Wrap flag mutations in a single transaction: update `flags`, insert into `audit_log`
with the actor (from session) and a diff of changed fields, commit together. Do not
split this across a trigger and app code — one write path, one place to get it right.

## User stories (source spec)

- As an engineer, I want to create a flag and target it to a percentage of users, so I
  can do gradual rollouts.
- As an engineer, I want to target by arbitrary user attributes (plan tier, region), so
  I can do segment-based releases.
- As an engineer, I want flag changes to propagate to connected clients within a
  second, so I don't need a redeploy to kill a bad flag.
- As an engineer, I want an audit log of who changed what flag and when, so rollbacks
  and post-incident review are possible.
- As a client app, I want a tiny SDK (<2kb) that caches flags locally and falls back
  gracefully if the service is down, so a flag-service outage never breaks the app.

## Open items for whoever (human or AI) picks this up next

- Auth/RBAC on the admin UI is not specified in the source ticket — needs a decision
  before the admin UI ticket can be scoped.
- Segment evaluation against `targeting_rules` needs a defined operator set beyond
  `eq`/`in`/`gt`/`lt`/`contains` if you want date ranges or semver comparisons later.
- No versioning/rollback of flag *definitions* (as opposed to audit log, which is
  read-only history) — if "revert to previous rule set" is wanted, that's a schema
  change (append-only rule versions, not update-in-place).
