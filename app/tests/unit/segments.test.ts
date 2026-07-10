import { describe, expect, it } from 'vitest'
import { validateSegmentRules } from '../../app/lib/repositories/segments.server'

describe('segment write-path validation', () => {
  it('rejects a rule with operator inSegment inside a segment definition', () => {
    expect(() =>
      validateSegmentRules([{ attribute: '', operator: 'inSegment', value: 'other', variant: true }]),
    ).toThrow(/inSegment/)
  })

  it('accepts a segment with only non-inSegment rules', () => {
    expect(() =>
      validateSegmentRules([{ attribute: 'plan', operator: 'eq', value: 'pro', variant: true }]),
    ).not.toThrow()
  })

  it('accepts an empty rule list', () => {
    expect(() => validateSegmentRules([])).not.toThrow()
  })
})
