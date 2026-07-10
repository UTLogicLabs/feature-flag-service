# 0004. Consistent-hash bucketing (FNV-1a)

Status: Accepted
Date: 2026-07-09

## Context
Percentage rollouts need to assign each user a stable bucket so that raising a
rollout percentage only ever adds users to the "in" set, never removes them.
Naive `Math.random()`-based bucketing reshuffles membership on every
evaluation, which means a user can flip in and out of a rollout across
requests as the percentage changes — unacceptable for a gradual-release
feature.

## Decision
Hash `flagKey:userId` with FNV-1a, reduce modulo 10000 to get a bucket in
`[0, 10000)`, and compare against `percentage * 100`. The exact algorithm
(`fnv1a`, `isInRollout`) is copied verbatim from `docs/ARCHITECTURE.md` into
`app/app/lib/hash.server.ts` and reused everywhere rollout logic is needed —
it is never reimplemented.

## Consequences
- Deterministic, dependency-free, and cheap to compute per evaluation.
- Guarantees the monotonic-superset property required by the product spec
  (verified by `evaluation.rollout-monotonic.property.test.ts` using
  `fast-check`).
- A user's bucket is stable per `(flagKey, userId)` pair, so different flags
  bucket the same user independently — no correlation between unrelated
  rollouts.
- Rejected: `Math.random()` per evaluation (violates monotonicity and
  stability); a cryptographic hash (unnecessary security property for this
  use case, more expensive per evaluation for no benefit).
