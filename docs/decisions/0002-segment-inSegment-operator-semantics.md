# 0002. Segment evaluation semantics (`inSegment` operator, no recursion)

Status: Accepted
Date: 2026-07-09

## Context
Targeting rules needed a way to reference a reusable segment (a named set of
attribute conditions) rather than only inline attribute comparisons. This
requires deciding: (a) how a user is judged to be "in" a segment given the
segment's own rule list, and (b) whether segments can reference other
segments.

## Decision
- `inSegment` matches if **any** of the target segment's own rules match (OR
  semantics) — the common "user is in tier A OR tier B" mental model.
- An empty segment rule list never matches (fail closed).
- Segments cannot reference other segments: any rule with
  `operator === 'inSegment'` inside a segment's own rule list is rejected at
  write time (`validateSegmentRules` in
  `app/app/lib/repositories/segments.server.ts`), returning a 400. The
  evaluation engine also guards against it defensively at read time (skips
  nested `inSegment` rules rather than recursing indefinitely), but the write-time
  rejection is the actual enforcement mechanism.
- A dangling segment reference (segment key present in a rule but deleted
  since) evaluates to no-match and logs a warning — it never throws, so
  evaluation can't 500 on stale data.

## Consequences
- OR semantics is simpler to reason about in the rule-builder UI than AND-of-all,
  and matches how segment membership is described in comparable products.
- Disallowing segment-to-segment references avoids cycle detection entirely;
  there is no near-term need for nested segments.
- If nested segments are wanted later, this is a breaking semantic change
  requiring cycle detection and would need a new ADR superseding this one.
