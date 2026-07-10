import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import { Form, useActionData, useLoaderData, useNavigation } from '@remix-run/react'
import { useState } from 'react'
import { requireRole } from '../lib/auth.server'
import { updateFlagWithAudit } from '../lib/audit.server'
import { getFlagById } from '../lib/repositories/flags.server'
import { listSegments } from '../lib/repositories/segments.server'
import type { Operator, Rule } from '../types/rule'

const OPERATORS: Operator[] = ['eq', 'in', 'gt', 'lt', 'contains', 'inSegment']

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireRole(request, ['viewer', 'editor', 'admin'])
  const flag = await getFlagById(params.flagId!)
  if (!flag) throw new Response('Not found', { status: 404 })
  const segments = await listSegments()
  return json({ flag, segments, canEdit: user.role !== 'viewer' })
}

export async function action({ request, params }: ActionFunctionArgs) {
  const user = await requireRole(request, ['editor', 'admin'])
  const flag = await getFlagById(params.flagId!)
  if (!flag) throw new Response('Not found', { status: 404 })

  const form = await request.formData()
  const rulesRaw = String(form.get('targeting_rules') ?? '[]')
  let rules: Rule[]
  try {
    rules = JSON.parse(rulesRaw)
  } catch {
    return json({ error: 'Invalid rules payload' }, { status: 400 })
  }

  const rollout = form.get('rollout_percentage')
  const defaultVariantRaw = String(form.get('default_variant') ?? 'false')
  let default_variant: boolean | string = defaultVariantRaw
  if (defaultVariantRaw === 'true' || defaultVariantRaw === 'false') {
    default_variant = defaultVariantRaw === 'true'
  }

  await updateFlagWithAudit(
    flag,
    {
      description: String(form.get('description') ?? ''),
      enabled: form.get('enabled') === 'on',
      is_kill_switch: form.get('is_kill_switch') === 'on',
      default_variant,
      rollout_percentage: rollout ? Number(rollout) : null,
      targeting_rules: rules,
    },
    { email: user.email, id: user.id },
  )

  return redirect(`/app/flags/${flag.id}`)
}

export default function FlagDetail() {
  const { flag, segments, canEdit } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const [rules, setRules] = useState<Rule[]>(flag.targeting_rules)
  const [confirmKill, setConfirmKill] = useState(false)

  function addRule() {
    setRules([...rules, { attribute: '', operator: 'eq', value: '', variant: true }])
  }

  function updateRule(index: number, patch: Partial<Rule>) {
    setRules(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function removeRule(index: number) {
    setRules(rules.filter((_, i) => i !== index))
  }

  function moveRule(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= rules.length) return
    const next = [...rules]
    ;[next[index], next[target]] = [next[target], next[index]]
    setRules(next)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-lg font-semibold">{flag.key}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{flag.environment}</p>
      {actionData?.error ? <p className="mb-4 text-sm text-red-600 dark:text-red-400">{actionData.error}</p> : null}

      <Form method="post" className="space-y-6">
        <input type="hidden" name="targeting_rules" value={JSON.stringify(rules)} />

        <div>
          <label className="block text-sm font-medium" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            defaultValue={flag.description ?? ''}
            disabled={!canEdit}
            className="mt-1 w-full rounded border border-border px-3 py-2 disabled:bg-muted"
          />
        </div>

        <div className="flex items-center gap-2">
          <input id="enabled" name="enabled" type="checkbox" defaultChecked={flag.enabled} disabled={!canEdit} />
          <label htmlFor="enabled" className="text-sm">
            Enabled
          </label>
        </div>

        <div className="rounded border border-red-200 bg-red-50 p-3 dark:border-red-500/30 dark:bg-red-500/10">
          <div className="flex items-center gap-2">
            <input
              id="is_kill_switch"
              name="is_kill_switch"
              type="checkbox"
              defaultChecked={flag.is_kill_switch}
              disabled={!canEdit}
              onChange={(e) => setConfirmKill(e.target.checked && !flag.is_kill_switch)}
            />
            <label htmlFor="is_kill_switch" className="text-sm font-medium text-red-700 dark:text-red-400">
              Kill switch (always evaluates to false, overrides everything)
            </label>
          </div>
          {confirmKill ? (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              Confirm before saving: this immediately disables the flag for all users once saved.
            </p>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="rollout_percentage">
            Rollout percentage
          </label>
          <input
            id="rollout_percentage"
            name="rollout_percentage"
            type="number"
            min={0}
            max={100}
            defaultValue={flag.rollout_percentage ?? ''}
            disabled={!canEdit}
            className="mt-1 w-32 rounded border border-border px-3 py-2 disabled:bg-muted"
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="default_variant">
            Default variant
          </label>
          <input
            id="default_variant"
            name="default_variant"
            defaultValue={String(flag.default_variant)}
            disabled={!canEdit}
            className="mt-1 w-48 rounded border border-border px-3 py-2 disabled:bg-muted"
          />
          <p className="mt-1 text-xs text-muted-foreground">Use "true"/"false" for boolean flags, or any string variant.</p>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium">Targeting rules (first match wins)</h2>
            {canEdit ? (
              <button type="button" onClick={addRule} className="text-sm text-primary hover:underline">
                + Add rule
              </button>
            ) : null}
          </div>
          <div className="space-y-2">
            {rules.map((rule, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2 rounded border border-border p-2">
                <input
                  placeholder="attribute"
                  value={rule.attribute}
                  disabled={!canEdit}
                  onChange={(e) => updateRule(index, { attribute: e.target.value })}
                  className="w-32 rounded border border-border px-2 py-1 text-sm"
                />
                <select
                  value={rule.operator}
                  disabled={!canEdit}
                  onChange={(e) => updateRule(index, { operator: e.target.value as Operator })}
                  className="rounded border border-border px-2 py-1 text-sm"
                >
                  {OPERATORS.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
                {rule.operator === 'inSegment' ? (
                  <select
                    value={String(rule.value)}
                    disabled={!canEdit}
                    onChange={(e) => updateRule(index, { value: e.target.value })}
                    className="rounded border border-border px-2 py-1 text-sm"
                  >
                    <option value="">select segment</option>
                    {segments.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.key}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    placeholder="value (comma-separated for 'in')"
                    value={Array.isArray(rule.value) ? rule.value.join(',') : rule.value}
                    disabled={!canEdit}
                    onChange={(e) =>
                      updateRule(index, {
                        value: rule.operator === 'in' ? e.target.value.split(',').map((v) => v.trim()) : e.target.value,
                      })
                    }
                    className="w-40 rounded border border-border px-2 py-1 text-sm"
                  />
                )}
                <input
                  placeholder="variant"
                  value={String(rule.variant)}
                  disabled={!canEdit}
                  onChange={(e) => updateRule(index, { variant: e.target.value })}
                  className="w-24 rounded border border-border px-2 py-1 text-sm"
                />
                {canEdit ? (
                  <div className="ml-auto flex gap-1">
                    <button type="button" onClick={() => moveRule(index, -1)} className="px-1 text-muted-foreground">
                      ↑
                    </button>
                    <button type="button" onClick={() => moveRule(index, 1)} className="px-1 text-muted-foreground">
                      ↓
                    </button>
                    <button type="button" onClick={() => removeRule(index)} className="px-1 text-red-600 dark:text-red-400">
                      remove
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {canEdit ? (
          <button
            type="submit"
            disabled={navigation.state === 'submitting'}
            className="rounded bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {navigation.state === 'submitting' ? 'Saving...' : 'Save changes'}
          </button>
        ) : null}
      </Form>
    </div>
  )
}
