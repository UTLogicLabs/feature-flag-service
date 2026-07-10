import type { Rule } from './rule'

export type Flag = {
  id: string
  key: string
  environment: string
  description: string | null
  enabled: boolean
  is_kill_switch: boolean
  default_variant: boolean | string
  rollout_percentage: number | null
  targeting_rules: Rule[]
  updated_at: string
}

export type FlagMap = Record<string, boolean | string>
