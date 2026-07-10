import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { requireRole } from '../lib/auth.server'
import { createFlag, getFlagByKeyAndEnvironment, listFlags } from '../lib/repositories/flags.server'

export async function loader({ request }: LoaderFunctionArgs) {
  await requireRole(request, ['viewer', 'editor', 'admin'])
  const url = new URL(request.url)
  const environment = url.searchParams.get('environment') ?? 'production'
  const flags = await listFlags(environment)
  return json({ flags })
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 })
  }
  await requireRole(request, ['editor', 'admin'])
  const body = await request.json()

  const existing = await getFlagByKeyAndEnvironment(body.key, body.environment)
  if (existing) {
    return json({ error: `Flag "${body.key}" already exists in environment "${body.environment}"` }, { status: 409 })
  }

  const flag = await createFlag(body)
  return json({ flag }, { status: 201 })
}
