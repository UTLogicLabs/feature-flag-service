import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import { Form, Link, useActionData, useLoaderData } from '@remix-run/react'
import { requireRole } from '../lib/auth.server'
import { createSegment, listSegments } from '../lib/repositories/segments.server'

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireRole(request, ['viewer', 'editor', 'admin'])
  const segments = await listSegments()
  return json({ segments, canEdit: user.role !== 'viewer' })
}

export async function action({ request }: ActionFunctionArgs) {
  await requireRole(request, ['editor', 'admin'])
  const form = await request.formData()
  const key = String(form.get('key') ?? '').trim()
  if (!key) return json({ error: 'Key is required' }, { status: 400 })
  const segment = await createSegment({ key, rules: [] })
  return redirect(`/app/segments/${segment.id}`)
}

export default function SegmentsIndex() {
  const { segments, canEdit } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

  return (
    <div className="max-w-xl">
      <h1 className="mb-4 text-lg font-semibold">Segments</h1>
      <ul className="mb-6 divide-y divide-gray-100 rounded border border-gray-200">
        {segments.map((s: any) => (
          <li key={s.id} className="px-3 py-2 text-sm">
            <Link to={`/app/segments/${s.id}`} className="text-blue-700 hover:underline">
              {s.key}
            </Link>
            <span className="ml-2 text-gray-400">{s.rules.length} rule(s)</span>
          </li>
        ))}
        {segments.length === 0 ? <li className="px-3 py-4 text-center text-gray-400">No segments yet.</li> : null}
      </ul>
      {canEdit ? (
        <Form method="post" className="flex gap-2">
          {actionData?.error ? <p className="text-sm text-red-600">{actionData.error}</p> : null}
          <input name="key" placeholder="new segment key" required className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <button type="submit" className="rounded bg-gray-900 px-3 py-2 text-sm text-white hover:bg-gray-700">
            Create
          </button>
        </Form>
      ) : null}
    </div>
  )
}
