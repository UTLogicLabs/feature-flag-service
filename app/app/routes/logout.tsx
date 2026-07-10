import type { ActionFunctionArgs } from '@remix-run/node'
import { redirect } from '@remix-run/node'
import { destroySession } from '../lib/auth.server'

export async function action({ request }: ActionFunctionArgs) {
  return destroySession(request)
}

export async function loader() {
  return redirect('/login')
}
