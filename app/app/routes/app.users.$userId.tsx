import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import { Form, useLoaderData } from '@remix-run/react'
import { requireRole } from '../lib/auth.server'
import { getUserById, setUserActive, setUserRole } from '../lib/repositories/users.server'
import type { UserRole } from '../types/user'

export async function loader({ request, params }: LoaderFunctionArgs) {
  await requireRole(request, ['admin'])
  const user = await getUserById(params.userId!)
  if (!user) throw new Response('Not found', { status: 404 })
  return json({ user })
}

export async function action({ request, params }: ActionFunctionArgs) {
  await requireRole(request, ['admin'])
  const form = await request.formData()
  const intent = String(form.get('intent') ?? '')

  if (intent === 'change-role') {
    await setUserRole(params.userId!, String(form.get('role')) as UserRole)
  } else if (intent === 'toggle-active') {
    const user = await getUserById(params.userId!)
    if (user) await setUserActive(params.userId!, !user.is_active)
  }

  return redirect(`/app/users/${params.userId}`)
}

export default function UserDetail() {
  const { user } = useLoaderData<typeof loader>()

  return (
    <div className="max-w-md">
      <h1 className="mb-1 text-lg font-semibold">{user.email}</h1>
      <p className="mb-4 text-sm text-muted-foreground">Created {new Date(user.created_at).toLocaleString()}</p>

      <Form method="post" className="mb-4 flex items-end gap-2">
        <input type="hidden" name="intent" value="change-role" />
        <div>
          <label className="block text-xs font-medium" htmlFor="role">
            Role
          </label>
          <select id="role" name="role" defaultValue={user.role} className="rounded border border-border px-2 py-1 text-sm">
            <option value="viewer">viewer</option>
            <option value="editor">editor</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <button type="submit" className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90">
          Update role
        </button>
      </Form>

      <Form method="post">
        <input type="hidden" name="intent" value="toggle-active" />
        <button
          type="submit"
          className={`rounded px-3 py-1.5 text-sm text-white ${
            user.is_active
              ? 'bg-red-600 hover:bg-red-500 dark:bg-red-500/80 dark:hover:bg-red-500'
              : 'bg-green-600 hover:bg-green-500 dark:bg-green-500/80 dark:hover:bg-green-500'
          }`}
        >
          {user.is_active ? 'Deactivate' : 'Reactivate'}
        </button>
      </Form>
    </div>
  )
}
