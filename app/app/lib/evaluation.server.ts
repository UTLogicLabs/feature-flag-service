import { isInRollout } from './hash.server'
import type { Flag } from '../types/flag'
import type { Rule, Segment } from '../types/rule'

export type UserContext = Record<string, unknown>

function compare(rule: Rule, contextValue: unknown): boolean {
  switch (rule.operator) {
    case 'eq':
      return String(contextValue) === String(rule.value)
    case 'in':
      return Array.isArray(rule.value) && rule.value.map(String).includes(String(contextValue))
    case 'gt':
      return Number(contextValue) > Number(rule.value)
    case 'lt':
      return Number(contextValue) < Number(rule.value)
    case 'contains':
      return typeof contextValue === 'string' && typeof rule.value === 'string' && contextValue.includes(rule.value)
    default:
      return false
  }
}

export function matchesRule(rule: Rule, context: UserContext, segmentsByKey: Map<string, Segment>): boolean {
  if (rule.operator === 'inSegment') {
    const segment = segmentsByKey.get(String(rule.value))
    if (!segment) return false
    return segment.rules.some(
      (r) => r.operator !== 'inSegment' && matchesRule(r, context, segmentsByKey),
    )
  }
  return compare(rule, context[rule.attribute])
}

export function evaluateFlag(
  flag: Flag,
  context: UserContext,
  segmentsByKey: Map<string, Segment>,
): boolean | string {
  if (flag.is_kill_switch) return false
  if (!flag.enabled) return flag.default_variant
  for (const rule of flag.targeting_rules) {
    if (matchesRule(rule, context, segmentsByKey)) return rule.variant
  }
  if (flag.rollout_percentage != null) {
    const userId = String(context.userId ?? context.id ?? '')
    if (isInRollout(flag.key, userId, flag.rollout_percentage)) return true
  }
  return flag.default_variant
}

export function evaluateFlags(
  flags: Flag[],
  context: UserContext,
  segments: Segment[],
): Record<string, boolean | string> {
  const segmentsByKey = new Map(segments.map((s) => [s.key, s]))
  return Object.fromEntries(flags.map((f) => [f.key, evaluateFlag(f, context, segmentsByKey)]))
}
