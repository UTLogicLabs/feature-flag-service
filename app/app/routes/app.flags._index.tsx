import type { LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { requireRole } from '../lib/auth.server'
import { listFlags } from '../lib/repositories/flags.server'

const ENVIRONMENTS = ['production', 'staging', 'development']

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireRole(request, ['viewer', 'editor', 'admin'])
  const url = new URL(request.url)
  const environment = url.searchParams.get('environment') ?? 'production'
  const flags = await listFlags(environment)
  return json({ flags, environment, canEdit: user.role !== 'viewer' })
}

export default function FlagsIndex() {
  const { flags, environment, canEdit } = useLoaderData<typeof loader>()

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-2">
          {ENVIRONMENTS.map((env) => (
            <Link
              key={env}
              to={`/app/flags?environment=${env}`}
              className={`rounded px-3 py-1 text-sm ${
                env === environment ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {env}
            </Link>
          ))}
        </div>
        {canEdit ? (
          <Link
            to={`/app/flags/new?environment=${environment}`}
            className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700"
          >
            New flag
          </Link>
        ) : null}
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-gray-500">
            <th className="py-2">Key</th>
            <th className="py-2">Enabled</th>
            <th className="py-2">Rollout %</th>
            <th className="py-2">Kill switch</th>
            <th className="py-2">Updated</th>
          </tr>
        </thead>
        <tbody>
          {flags.map((flag) => (
            <tr key={flag.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2">
                <Link to={`/app/flags/${flag.id}`} className="text-blue-700 hover:underline">
                  {flag.key}
                </Link>
              </td>
              <td className="py-2">{flag.enabled ? 'Yes' : 'No'}</td>
              <td className="py-2">{flag.rollout_percentage ?? '—'}</td>
              <td className="py-2">
                {flag.is_kill_switch ? (
                  <span className="rounded bg-red-100 px-2 py-0.5 text-xs text-red-700">Kill switch</span>
                ) : (
                  '—'
                )}
              </td>
              <td className="py-2 text-gray-500">{new Date(flag.updated_at).toLocaleString()}</td>
            </tr>
          ))}
          {flags.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-6 text-center text-gray-400">
                No flags in {environment} yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
