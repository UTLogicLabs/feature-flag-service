import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { requireRole } from '../lib/auth.server'
import { createSegment, listSegments } from '../lib/repositories/segments.server'

export async function loader({ request }: LoaderFunctionArgs) {
  await requireRole(request, ['viewer', 'editor', 'admin'])
  const segments = await listSegments()
  return json({ segments })
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 })
  }
  await requireRole(request, ['editor', 'admin'])
  const body = await request.json()
  try {
    const segment = await createSegment(body)
    return json({ segment }, { status: 201 })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Invalid segment' }, { status: 400 })
  }
}
