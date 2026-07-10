import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { requireRole } from '../lib/auth.server'
import { updateFlagWithAudit } from '../lib/audit.server'
import { deleteFlag, getFlagById } from '../lib/repositories/flags.server'

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireRole(request, ['viewer', 'editor', 'admin'])
  const flag = await getFlagById(params.flagId!)
  if (!flag) return json({ error: 'Not found' }, { status: 404 })
  return json({ flag })
}

export async function action({ request, params }: ActionFunctionArgs) {
  const flagId = params.flagId!

  if (request.method === 'DELETE') {
    await requireRole(request, ['editor', 'admin'])
    const deleted = await deleteFlag(flagId)
    if (!deleted) return json({ error: 'Not found' }, { status: 404 })
    return json({ ok: true })
  }

  if (request.method === 'PATCH') {
    const user = await requireRole(request, ['editor', 'admin'])
    const existing = await getFlagById(flagId)
    if (!existing) return json({ error: 'Not found' }, { status: 404 })
    const body = await request.json()
    const flag = await updateFlagWithAudit(existing, body, { email: user.email, id: user.id })
    return json({ flag })
  }

  return json({ error: 'Method not allowed' }, { status: 405 })
}
