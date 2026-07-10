import { query } from '../db.server'
import type { Rule, Segment } from '../../types/rule'

export function validateSegmentRules(rules: Rule[]): void {
  const offending = rules.find((r) => r.operator === 'inSegment')
  if (offending) {
    throw new Error('Segment rules must not use operator "inSegment" (no nested segments allowed)')
  }
}

export async function listSegments(): Promise<Array<Segment & { id: string }>> {
  const result = await query<{ id: string; key: string; rules: Rule[] }>(
    'select id, key, rules from segments order by key asc',
  )
  return result.rows
}

export async function getSegmentByKey(key: string): Promise<Segment | null> {
  const result = await query<{ key: string; rules: Rule[] }>('select key, rules from segments where key = $1', [key])
  return result.rows[0] ?? null
}

export async function getSegmentById(id: string): Promise<(Segment & { id: string }) | null> {
  const result = await query<{ id: string; key: string; rules: Rule[] }>(
    'select id, key, rules from segments where id = $1',
    [id],
  )
  return result.rows[0] ?? null
}

export async function createSegment(input: { key: string; rules: Rule[] }): Promise<Segment & { id: string }> {
  validateSegmentRules(input.rules)
  const result = await query<{ id: string; key: string; rules: Rule[] }>(
    'insert into segments (key, rules) values ($1, $2) returning id, key, rules',
    [input.key, JSON.stringify(input.rules)],
  )
  return result.rows[0]
}

export async function updateSegment(
  id: string,
  input: { key?: string; rules?: Rule[] },
): Promise<(Segment & { id: string }) | null> {
  if (input.rules) validateSegmentRules(input.rules)
  const existing = await getSegmentById(id)
  if (!existing) return null
  const key = input.key ?? existing.key
  const rules = input.rules ?? existing.rules
  const result = await query<{ id: string; key: string; rules: Rule[] }>(
    'update segments set key = $2, rules = $3 where id = $1 returning id, key, rules',
    [id, key, JSON.stringify(rules)],
  )
  return result.rows[0] ?? null
}

export async function deleteSegment(id: string): Promise<boolean> {
  const result = await query('delete from segments where id = $1', [id])
  return (result.rowCount ?? 0) > 0
}
