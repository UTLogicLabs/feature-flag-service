import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import { Form, useActionData, useLoaderData, useNavigation } from '@remix-run/react'
import { useState } from 'react'
import { requireRole } from '../lib/auth.server'
import { getSegmentById, updateSegment } from '../lib/repositories/segments.server'
import type { Operator, Rule } from '../types/rule'

// Segment rules reuse the shared Rule type (which includes `variant`), but segment
// matching only cares about attribute/operator/value -- the variant field is hidden
// here since segments are match/no-match conditions, not variant-assigning rules.
const SEGMENT_OPERATORS: Operator[] = ['eq', 'in', 'gt', 'lt', 'contains']

export async function loader({ request, params }: LoaderFunctionArgs) {
  const user = await requireRole(request, ['viewer', 'editor', 'admin'])
  const segment = await getSegmentById(params.segmentId!)
  if (!segment) throw new Response('Not found', { status: 404 })
  return json({ segment, canEdit: user.role !== 'viewer' })
}

export async function action({ request, params }: ActionFunctionArgs) {
  await requireRole(request, ['editor', 'admin'])
  const form = await request.formData()
  const rulesRaw = String(form.get('rules') ?? '[]')
  let rules: Rule[]
  try {
    rules = JSON.parse(rulesRaw)
  } catch {
    return json({ error: 'Invalid rules payload' }, { status: 400 })
  }

  try {
    const segment = await updateSegment(params.segmentId!, { rules })
    if (!segment) return json({ error: 'Not found' }, { status: 404 })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Invalid rules' }, { status: 400 })
  }

  return redirect(`/app/segments/${params.segmentId}`)
}

export default function SegmentDetail() {
  const { segment, canEdit } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const [rules, setRules] = useState<Rule[]>(segment.rules)

  function addRule() {
    setRules([...rules, { attribute: '', operator: 'eq', value: '', variant: true }])
  }

  function updateRule(index: number, patch: Partial<Rule>) {
    setRules(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  function removeRule(index: number) {
    setRules(rules.filter((_, i) => i !== index))
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-lg font-semibold">{segment.key}</h1>
      <p className="mb-4 text-sm text-gray-500">Matches if ANY rule below is true.</p>
      {actionData?.error ? <p className="mb-4 text-sm text-red-600">{actionData.error}</p> : null}

      <Form method="post" className="space-y-4">
        <input type="hidden" name="rules" value={JSON.stringify(rules)} />

        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium">Rules</h2>
          {canEdit ? (
            <button type="button" onClick={addRule} className="text-sm text-blue-700 hover:underline">
              + Add rule
            </button>
          ) : null}
        </div>

        <div className="space-y-2">
          {rules.map((rule, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2 rounded border border-gray-200 p-2">
              <input
                placeholder="attribute"
                value={rule.attribute}
                disabled={!canEdit}
                onChange={(e) => updateRule(index, { attribute: e.target.value })}
                className="w-32 rounded border border-gray-300 px-2 py-1 text-sm"
              />
              <select
                value={rule.operator}
                disabled={!canEdit}
                onChange={(e) => updateRule(index, { operator: e.target.value as Operator })}
                className="rounded border border-gray-300 px-2 py-1 text-sm"
              >
                {SEGMENT_OPERATORS.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
              <input
                placeholder="value (comma-separated for 'in')"
                value={Array.isArray(rule.value) ? rule.value.join(',') : rule.value}
                disabled={!canEdit}
                onChange={(e) =>
                  updateRule(index, {
                    value: rule.operator === 'in' ? e.target.value.split(',').map((v) => v.trim()) : e.target.value,
                  })
                }
                className="w-40 rounded border border-gray-300 px-2 py-1 text-sm"
              />
              {canEdit ? (
                <button type="button" onClick={() => removeRule(index)} className="ml-auto px-1 text-red-600">
                  remove
                </button>
              ) : null}
            </div>
          ))}
        </div>

        {canEdit ? (
          <button
            type="submit"
            disabled={navigation.state === 'submitting'}
            className="rounded bg-gray-900 px-4 py-2 text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {navigation.state === 'submitting' ? 'Saving...' : 'Save changes'}
          </button>
        ) : null}
      </Form>
    </div>
  )
}
