import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import { Form, Link, useActionData, useLoaderData } from '@remix-run/react'
import { requireRole } from '../lib/auth.server'
import { createUser, getUserByEmail, listUsers } from '../lib/repositories/users.server'
import type { UserRole } from '../types/user'

export async function loader({ request }: LoaderFunctionArgs) {
  await requireRole(request, ['admin'])
  const users = await listUsers()
  return json({ users })
}

export async function action({ request }: ActionFunctionArgs) {
  await requireRole(request, ['admin'])
  const form = await request.formData()
  const email = String(form.get('email') ?? '').trim()
  const password = String(form.get('password') ?? '')
  const role = String(form.get('role') ?? 'viewer') as UserRole

  if (!email || !password) return json({ error: 'Email and temporary password are required' }, { status: 400 })

  const existing = await getUserByEmail(email)
  if (existing) return json({ error: `A user with email ${email} already exists` }, { status: 409 })

  await createUser({ email, password, role })
  return redirect('/app/users')
}

export default function UsersIndex() {
  const { users } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-lg font-semibold">Users</h1>
      <table className="mb-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-2">Email</th>
            <th className="py-2">Role</th>
            <th className="py-2">Active</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-border">
              <td className="py-2">{u.email}</td>
              <td className="py-2">{u.role}</td>
              <td className="py-2">{u.is_active ? 'Yes' : 'No'}</td>
              <td className="py-2">
                <Link to={`/app/users/${u.id}`} className="text-primary hover:underline">
                  Manage
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mb-2 text-sm font-medium">Invite user</h2>
      <p className="mb-2 text-xs text-muted-foreground">
        No email infrastructure — communicate the temporary password out of band.
      </p>
      <Form method="post" className="flex flex-wrap items-end gap-2">
        {actionData?.error ? <p className="w-full text-sm text-red-600 dark:text-red-400">{actionData.error}</p> : null}
        <div>
          <label className="block text-xs font-medium" htmlFor="email">
            Email
          </label>
          <input id="email" name="email" type="email" required className="rounded border border-border px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium" htmlFor="password">
            Temp password
          </label>
          <input
            id="password"
            name="password"
            type="text"
            required
            className="rounded border border-border px-2 py-1 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium" htmlFor="role">
            Role
          </label>
          <select id="role" name="role" className="rounded border border-border px-2 py-1 text-sm">
            <option value="viewer">viewer</option>
            <option value="editor">editor</option>
            <option value="admin">admin</option>
          </select>
        </div>
        <button type="submit" className="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90">
          Create
        </button>
      </Form>
    </div>
  )
}
