import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Form, useActionData, useSearchParams } from '@remix-run/react'
import { createUserSession, sessionStorage } from '../lib/auth.server'
import { getUserById, getUserByEmail, verifyPassword } from '../lib/repositories/users.server'

export async function loader({ request }: LoaderFunctionArgs) {
  const session = await sessionStorage.getSession(request.headers.get('Cookie'))
  const userId = session.get('userId')
  if (userId) {
    const user = await getUserById(userId)
    if (user && user.is_active) throw new Response(null, { status: 302, headers: { Location: '/app/flags' } })
  }
  return json({})
}

export async function action({ request }: ActionFunctionArgs) {
  const form = await request.formData()
  const email = String(form.get('email') ?? '')
  const password = String(form.get('password') ?? '')
  const redirectTo = String(form.get('redirectTo') ?? '/app/flags')

  const user = await getUserByEmail(email)
  if (!user || !user.is_active || !(await verifyPassword(user, password))) {
    return json({ error: 'Invalid email or password' }, { status: 400 })
  }
  return createUserSession(user.id, redirectTo)
}

export default function Login() {
  const actionData = useActionData<typeof action>()
  const [searchParams] = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') ?? '/app/flags'

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Form method="post" className="w-full max-w-sm space-y-4 rounded border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <input type="hidden" name="redirectTo" value={redirectTo} />
        {actionData?.error ? <p className="text-sm text-red-600">{actionData.error}</p> : null}
        <div>
          <label className="block text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
          />
        </div>
        <button type="submit" className="w-full rounded bg-gray-900 px-3 py-2 text-white hover:bg-gray-700">
          Sign in
        </button>
      </Form>
    </div>
  )
}
