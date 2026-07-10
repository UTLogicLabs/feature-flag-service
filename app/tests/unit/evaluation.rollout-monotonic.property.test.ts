import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { isInRollout } from '../../app/lib/hash.server'

describe('rollout monotonicity property', () => {
  it('raising the rollout percentage never removes a user (superset property)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('checkout', 'new-nav', 'beta-search'),
        fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 20, maxLength: 200 }),
        fc.integer({ min: 0, max: 99 }),
        fc.integer({ min: 1, max: 100 }),
        (flagKey, userIds, lowerPct, delta) => {
          const higherPct = Math.min(100, lowerPct + delta)
          const lowerSet = new Set(userIds.filter((id) => isInRollout(flagKey, id, lowerPct)))
          const higherSet = new Set(userIds.filter((id) => isInRollout(flagKey, id, higherPct)))
          for (const id of lowerSet) {
            expect(higherSet.has(id)).toBe(true)
          }
        },
      ),
      { numRuns: 200 },
    )
  })
})
