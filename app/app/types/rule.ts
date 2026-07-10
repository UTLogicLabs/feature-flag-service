export type Operator = 'eq' | 'in' | 'gt' | 'lt' | 'contains' | 'inSegment'

export type Rule = {
  attribute: string
  operator: Operator
  value: string | Array<string>
  variant: boolean | string
}

export type Segment = {
  key: string
  rules: Rule[]
}
