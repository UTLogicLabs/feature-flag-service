import { query } from '../db.server'

export type AuditLogEntry = {
  id: string
  flag_key: string
  actor: string
  actor_user_id: string | null
  diff: Record<string, { from: unknown; to: unknown }>
  created_at: string
}

export async function listAuditLog(filters: {
  flagKey?: string
  actor?: string
  limit?: number
  offset?: number
}): Promise<AuditLogEntry[]> {
  const conditions: string[] = []
  const params: unknown[] = []
  if (filters.flagKey) {
    params.push(filters.flagKey)
    conditions.push(`flag_key = $${params.length}`)
  }
  if (filters.actor) {
    params.push(`%${filters.actor}%`)
    conditions.push(`actor ilike $${params.length}`)
  }
  const where = conditions.length ? `where ${conditions.join(' and ')}` : ''
  params.push(filters.limit ?? 50)
  const limitParam = params.length
  params.push(filters.offset ?? 0)
  const offsetParam = params.length
  const result = await query<AuditLogEntry>(
    `select * from audit_log ${where} order by created_at desc limit $${limitParam} offset $${offsetParam}`,
    params,
  )
  return result.rows
}
