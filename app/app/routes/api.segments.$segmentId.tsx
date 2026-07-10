import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { requireRole } from '../lib/auth.server'
import { deleteSegment, getSegmentById, updateSegment } from '../lib/repositories/segments.server'

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireRole(request, ['viewer', 'editor', 'admin'])
  const segment = await getSegmentById(params.segmentId!)
  if (!segment) return json({ error: 'Not found' }, { status: 404 })
  return json({ segment })
}

export async function action({ request, params }: ActionFunctionArgs) {
  const segmentId = params.segmentId!

  if (request.method === 'DELETE') {
    await requireRole(request, ['editor', 'admin'])
    const deleted = await deleteSegment(segmentId)
    if (!deleted) return json({ error: 'Not found' }, { status: 404 })
    return json({ ok: true })
  }

  if (request.method === 'PATCH') {
    await requireRole(request, ['editor', 'admin'])
    const body = await request.json()
    try {
      const segment = await updateSegment(segmentId, body)
      if (!segment) return json({ error: 'Not found' }, { status: 404 })
      return json({ segment })
    } catch (err) {
      return json({ error: err instanceof Error ? err.message : 'Invalid segment' }, { status: 400 })
    }
  }

  return json({ error: 'Method not allowed' }, { status: 405 })
}
