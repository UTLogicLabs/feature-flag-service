import { describe, expect, it } from 'vitest'
import { matchesRule } from '../../app/lib/evaluation.server'
import type { Rule, Segment } from '../../app/types/rule'

const noSegments = new Map<string, Segment>()

describe('matchesRule operators', () => {
  it('eq', () => {
    const rule: Rule = { attribute: 'plan', operator: 'eq', value: 'pro', variant: true }
    expect(matchesRule(rule, { plan: 'pro' }, noSegments)).toBe(true)
    expect(matchesRule(rule, { plan: 'free' }, noSegments)).toBe(false)
  })

  it('in', () => {
    const rule: Rule = { attribute: 'region', operator: 'in', value: ['us', 'ca'], variant: true }
    expect(matchesRule(rule, { region: 'us' }, noSegments)).toBe(true)
    expect(matchesRule(rule, { region: 'uk' }, noSegments)).toBe(false)
  })

  it('gt', () => {
    const rule: Rule = { attribute: 'age', operator: 'gt', value: '18', variant: true }
    expect(matchesRule(rule, { age: 21 }, noSegments)).toBe(true)
    expect(matchesRule(rule, { age: 10 }, noSegments)).toBe(false)
  })

  it('lt', () => {
    const rule: Rule = { attribute: 'age', operator: 'lt', value: '18', variant: true }
    expect(matchesRule(rule, { age: 10 }, noSegments)).toBe(true)
    expect(matchesRule(rule, { age: 21 }, noSegments)).toBe(false)
  })

  it('contains', () => {
    const rule: Rule = { attribute: 'email', operator: 'contains', value: '@acme.com', variant: true }
    expect(matchesRule(rule, { email: 'a@acme.com' }, noSegments)).toBe(true)
    expect(matchesRule(rule, { email: 'a@other.com' }, noSegments)).toBe(false)
  })

  describe('inSegment', () => {
    it('matches when any of the segment rules match (OR semantics)', () => {
      const segments = new Map<string, Segment>([
        [
          'power-users',
          {
            key: 'power-users',
            rules: [
              { attribute: 'plan', operator: 'eq', value: 'enterprise', variant: true },
              { attribute: 'seats', operator: 'gt', value: '50', variant: true },
            ],
          },
        ],
      ])
      const rule: Rule = { attribute: '', operator: 'inSegment', value: 'power-users', variant: true }
      expect(matchesRule(rule, { plan: 'free', seats: 100 }, segments)).toBe(true)
      expect(matchesRule(rule, { plan: 'enterprise', seats: 1 }, segments)).toBe(true)
      expect(matchesRule(rule, { plan: 'free', seats: 1 }, segments)).toBe(false)
    })

    it('returns false when the segment is not found (dangling reference)', () => {
      const rule: Rule = { attribute: '', operator: 'inSegment', value: 'missing', variant: true }
      expect(matchesRule(rule, {}, noSegments)).toBe(false)
    })

    it('returns false when the segment has no rules (fail closed)', () => {
      const segments = new Map<string, Segment>([['empty', { key: 'empty', rules: [] }]])
      const rule: Rule = { attribute: '', operator: 'inSegment', value: 'empty', variant: true }
      expect(matchesRule(rule, {}, segments)).toBe(false)
    })

    it('ignores nested inSegment rules inside a segment as defense in depth', () => {
      const segments = new Map<string, Segment>([
        [
          'nested',
          {
            key: 'nested',
            rules: [{ attribute: '', operator: 'inSegment', value: 'nested', variant: true }],
          },
        ],
      ])
      const rule: Rule = { attribute: '', operator: 'inSegment', value: 'nested', variant: true }
      expect(matchesRule(rule, {}, segments)).toBe(false)
    })
  })
})
