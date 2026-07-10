import { query } from '../db.server'
import { evaluateFlags, type UserContext } from '../evaluation.server'
import { listSegments } from './segments.server'
import type { Flag, FlagMap } from '../../types/flag'
import type { Rule } from '../../types/rule'

export async function listFlags(environment: string): Promise<Flag[]> {
  const result = await query<Flag>(
    'select * from flags where environment = $1 order by key asc',
    [environment],
  )
  return result.rows
}

export async function getFlagById(id: string): Promise<Flag | null> {
  const result = await query<Flag>('select * from flags where id = $1', [id])
  return result.rows[0] ?? null
}

export async function getFlagByKeyAndEnvironment(key: string, environment: string): Promise<Flag | null> {
  const result = await query<Flag>('select * from flags where key = $1 and environment = $2', [key, environment])
  return result.rows[0] ?? null
}

export type CreateFlagInput = {
  key: string
  environment: string
  description?: string | null
  enabled?: boolean
  is_kill_switch?: boolean
  default_variant?: boolean | string
  rollout_percentage?: number | null
  targeting_rules?: Rule[]
}

export async function createFlag(input: CreateFlagInput): Promise<Flag> {
  const result = await query<Flag>(
    `insert into flags
      (key, environment, description, enabled, is_kill_switch, default_variant, rollout_percentage, targeting_rules)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     returning *`,
    [
      input.key,
      input.environment,
      input.description ?? null,
      input.enabled ?? false,
      input.is_kill_switch ?? false,
      JSON.stringify(input.default_variant ?? false),
      input.rollout_percentage ?? null,
      JSON.stringify(input.targeting_rules ?? []),
    ],
  )
  return result.rows[0]
}

export type UpdateFlagInput = Partial<CreateFlagInput>

export async function updateFlag(id: string, input: UpdateFlagInput): Promise<Flag | null> {
  const existing = await getFlagById(id)
  if (!existing) return null
  const merged = {
    description: input.description !== undefined ? input.description : existing.description,
    enabled: input.enabled !== undefined ? input.enabled : existing.enabled,
    is_kill_switch: input.is_kill_switch !== undefined ? input.is_kill_switch : existing.is_kill_switch,
    default_variant: input.default_variant !== undefined ? input.default_variant : existing.default_variant,
    rollout_percentage:
      input.rollout_percentage !== undefined ? input.rollout_percentage : existing.rollout_percentage,
    targeting_rules: input.targeting_rules !== undefined ? input.targeting_rules : existing.targeting_rules,
  }
  const result = await query<Flag>(
    `update flags set
      description = $2, enabled = $3, is_kill_switch = $4, default_variant = $5,
      rollout_percentage = $6, targeting_rules = $7, updated_at = now()
     where id = $1
     returning *`,
    [
      id,
      merged.description,
      merged.enabled,
      merged.is_kill_switch,
      JSON.stringify(merged.default_variant),
      merged.rollout_percentage,
      JSON.stringify(merged.targeting_rules),
    ],
  )
  return result.rows[0] ?? null
}

export async function deleteFlag(id: string): Promise<boolean> {
  const result = await query('delete from flags where id = $1', [id])
  return (result.rowCount ?? 0) > 0
}

export async function evaluateForEnvironment(environment: string, context: UserContext): Promise<FlagMap> {
  const [flags, segments] = await Promise.all([listFlags(environment), listSegments()])
  return evaluateFlags(flags, context, segments)
}
