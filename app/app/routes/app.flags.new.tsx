import type { ActionFunctionArgs, LoaderFunctionArgs } from '@remix-run/node'
import { json, redirect } from '@remix-run/node'
import { Form, useActionData, useLoaderData } from '@remix-run/react'
import { requireRole } from '../lib/auth.server'
import { createFlag, getFlagByKeyAndEnvironment } from '../lib/repositories/flags.server'

export async function loader({ request }: LoaderFunctionArgs) {
  await requireRole(request, ['editor', 'admin'])
  const url = new URL(request.url)
  return json({ environment: url.searchParams.get('environment') ?? 'production' })
}

export async function action({ request }: ActionFunctionArgs) {
  await requireRole(request, ['editor', 'admin'])
  const form = await request.formData()
  const key = String(form.get('key') ?? '').trim()
  const environment = String(form.get('environment') ?? 'production')
  const description = String(form.get('description') ?? '')

  if (!key) return json({ error: 'Key is required' }, { status: 400 })

  const existing = await getFlagByKeyAndEnvironment(key, environment)
  if (existing) return json({ error: `Flag "${key}" already exists in ${environment}` }, { status: 409 })

  const flag = await createFlag({ key, environment, description })
  return redirect(`/app/flags/${flag.id}`)
}

export default function NewFlag() {
  const { environment } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

  return (
    <div className="max-w-lg">
      <h1 className="mb-4 text-lg font-semibold">New flag</h1>
      <Form method="post" className="space-y-4">
        {actionData?.error ? <p className="text-sm text-red-600 dark:text-red-400">{actionData.error}</p> : null}
        <div>
          <label className="block text-sm font-medium" htmlFor="key">
            Key
          </label>
          <input id="key" name="key" required className="mt-1 w-full rounded border border-border px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="environment">
            Environment
          </label>
          <input
            id="environment"
            name="environment"
            defaultValue={environment}
            className="mt-1 w-full rounded border border-border px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium" htmlFor="description">
            Description
          </label>
          <textarea id="description" name="description" className="mt-1 w-full rounded border border-border px-3 py-2" />
        </div>
        <button type="submit" className="rounded bg-primary px-3 py-2 text-primary-foreground hover:bg-primary/90">
          Create
        </button>
      </Form>
    </div>
  )
}
