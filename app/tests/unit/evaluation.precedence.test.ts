import { describe, expect, it } from 'vitest'
import { evaluateFlag } from '../../app/lib/evaluation.server'
import type { Flag } from '../../app/types/flag'
import type { Segment } from '../../app/types/rule'

const noSegments = new Map<string, Segment>()

function baseFlag(overrides: Partial<Flag> = {}): Flag {
  return {
    id: '1',
    key: 'test-flag',
    environment: 'production',
    description: null,
    enabled: true,
    is_kill_switch: false,
    default_variant: false,
    rollout_percentage: null,
    targeting_rules: [],
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('evaluation precedence', () => {
  it('kill switch overrides everything, even a matching targeting rule', () => {
    const flag = baseFlag({
      is_kill_switch: true,
      enabled: true,
      targeting_rules: [{ attribute: 'plan', operator: 'eq', value: 'pro', variant: true }],
    })
    expect(evaluateFlag(flag, { plan: 'pro' }, noSegments)).toBe(false)
  })

  it('disabled flag ignores targeting rules and returns default_variant', () => {
    const flag = baseFlag({
      enabled: false,
      default_variant: 'off',
      targeting_rules: [{ attribute: 'plan', operator: 'eq', value: 'pro', variant: 'on' }],
    })
    expect(evaluateFlag(flag, { plan: 'pro' }, noSegments)).toBe('off')
  })

  it('first matching rule wins over later ones', () => {
    const flag = baseFlag({
      targeting_rules: [
        { attribute: 'plan', operator: 'eq', value: 'pro', variant: 'first' },
        { attribute: 'plan', operator: 'eq', value: 'pro', variant: 'second' },
      ],
    })
    expect(evaluateFlag(flag, { plan: 'pro' }, noSegments)).toBe('first')
  })

  it('rollout only applies when no targeting rule matched', () => {
    const flag = baseFlag({
      targeting_rules: [{ attribute: 'plan', operator: 'eq', value: 'nomatch', variant: 'rule-hit' }],
      rollout_percentage: 100,
      default_variant: false,
    })
    expect(evaluateFlag(flag, { plan: 'other', userId: 'u1' }, noSegments)).toBe(true)
  })

  it('default_variant is the final fallback when no rule matches and no rollout is set', () => {
    const flag = baseFlag({
      targeting_rules: [{ attribute: 'plan', operator: 'eq', value: 'nomatch', variant: 'rule-hit' }],
      rollout_percentage: null,
      default_variant: 'fallback',
    })
    expect(evaluateFlag(flag, { plan: 'other' }, noSegments)).toBe('fallback')
  })
})
