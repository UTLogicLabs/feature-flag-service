import { pool } from './db.server'
import type { Flag } from '../types/flag'
import type { UpdateFlagInput } from './repositories/flags.server'

function diffFields(before: Flag, input: UpdateFlagInput): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {}
  for (const key of Object.keys(input) as Array<keyof UpdateFlagInput>) {
    if (input[key] === undefined) continue
    const from = (before as any)[key]
    const to = input[key]
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      diff[key] = { from, to }
    }
  }
  return diff
}

export async function updateFlagWithAudit(
  before: Flag,
  input: UpdateFlagInput,
  actor: { email: string; id: string },
): Promise<Flag> {
  const diff = diffFields(before, input)
  const merged = {
    description: input.description !== undefined ? input.description : before.description,
    enabled: input.enabled !== undefined ? input.enabled : before.enabled,
    is_kill_switch: input.is_kill_switch !== undefined ? input.is_kill_switch : before.is_kill_switch,
    default_variant: input.default_variant !== undefined ? input.default_variant : before.default_variant,
    rollout_percentage:
      input.rollout_percentage !== undefined ? input.rollout_percentage : before.rollout_percentage,
    targeting_rules: input.targeting_rules !== undefined ? input.targeting_rules : before.targeting_rules,
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const updateResult = await client.query<Flag>(
      `update flags set
        description = $2, enabled = $3, is_kill_switch = $4, default_variant = $5,
        rollout_percentage = $6, targeting_rules = $7, updated_at = now()
       where id = $1
       returning *`,
      [
        before.id,
        merged.description,
        merged.enabled,
        merged.is_kill_switch,
        JSON.stringify(merged.default_variant),
        merged.rollout_percentage,
        JSON.stringify(merged.targeting_rules),
      ],
    )
    await client.query(
      'insert into audit_log (flag_key, actor, actor_user_id, diff) values ($1, $2, $3, $4)',
      [before.key, actor.email, actor.id, JSON.stringify(diff)],
    )
    await client.query('COMMIT')
    return updateResult.rows[0]
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}
