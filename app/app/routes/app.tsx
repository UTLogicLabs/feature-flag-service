import type { LoaderFunctionArgs } from '@remix-run/node'
import { json } from '@remix-run/node'
import { Form, Link, Outlet, useLoaderData } from '@remix-run/react'
import { requireUser } from '../lib/auth.server'
import { ThemeToggle } from '../components/theme-toggle'

export async function loader({ request }: LoaderFunctionArgs) {
  const user = await requireUser(request)
  return json({ user: { email: user.email, role: user.role } })
}

export default function AppLayout() {
  const { user } = useLoaderData<typeof loader>()

  return (
    <div className="min-h-screen">
      <nav className="flex items-center justify-between border-b border-border bg-background px-6 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold">Feature Flags</span>
          <Link to="/app/flags" className="text-sm text-muted-foreground hover:text-foreground">
            Flags
          </Link>
          <Link to="/app/segments" className="text-sm text-muted-foreground hover:text-foreground">
            Segments
          </Link>
          <Link to="/app/audit-log" className="text-sm text-muted-foreground hover:text-foreground">
            Audit Log
          </Link>
          {user.role === 'admin' ? (
            <Link to="/app/users" className="text-sm text-muted-foreground hover:text-foreground">
              Users
            </Link>
          ) : null}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <ThemeToggle />
          <span>
            {user.email} ({user.role})
          </span>
          <Form method="post" action="/logout">
            <button type="submit" className="rounded border border-border px-2 py-1 hover:bg-muted">
              Sign out
            </button>
          </Form>
        </div>
      </nav>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
