import type { LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Form, useLoaderData } from '@remix-run/react'
import { requireRole } from '../lib/auth.server'
import { listAuditLog } from '../lib/repositories/audit.server'

export async function loader({ request }: LoaderFunctionArgs) {
  await requireRole(request, ['viewer', 'editor', 'admin'])
  const url = new URL(request.url)
  const flagKey = url.searchParams.get('flagKey') ?? undefined
  const actor = url.searchParams.get('actor') ?? undefined
  const entries = await listAuditLog({ flagKey, actor })
  return json({ entries, flagKey: flagKey ?? '', actor: actor ?? '' })
}

export default function AuditLog() {
  const { entries, flagKey, actor } = useLoaderData<typeof loader>()

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold">Audit Log</h1>
      <Form method="get" className="mb-4 flex gap-2">
        <input name="flagKey" defaultValue={flagKey} placeholder="filter by flag key" className="rounded border border-gray-300 px-2 py-1 text-sm" />
        <input name="actor" defaultValue={actor} placeholder="filter by actor" className="rounded border border-gray-300 px-2 py-1 text-sm" />
        <button type="submit" className="rounded bg-gray-900 px-3 py-1 text-sm text-white hover:bg-gray-700">
          Filter
        </button>
      </Form>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="py-2">Flag</th>
            <th className="py-2">Actor</th>
            <th className="py-2">Diff</th>
            <th className="py-2">When</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-gray-100 align-top">
              <td className="py-2">{entry.flag_key}</td>
              <td className="py-2">{entry.actor}</td>
              <td className="py-2">
                <pre className="max-w-md whitespace-pre-wrap text-xs text-gray-600">
                  {JSON.stringify(entry.diff, null, 2)}
                </pre>
              </td>
              <td className="py-2 text-gray-500">{new Date(entry.created_at).toLocaleString()}</td>
            </tr>
          ))}
          {entries.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-6 text-center text-gray-400">
                No audit entries yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
