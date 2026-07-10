import { createCookieSessionStorage, redirect } from '@remix-run/node'
import { getUserById } from './repositories/users.server'
import type { User, UserRole } from '../types/user'

const ROLE_RANK: Record<UserRole, number> = { viewer: 0, editor: 1, admin: 2 }

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: 'ffs_session',
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secrets: [process.env.SESSION_SECRET ?? 'dev-secret-change-me'],
    secure: process.env.NODE_ENV === 'production',
  },
})

export async function createUserSession(userId: string, redirectTo: string): Promise<Response> {
  const session = await sessionStorage.getSession()
  session.set('userId', userId)
  return redirect(redirectTo, {
    headers: { 'Set-Cookie': await sessionStorage.commitSession(session) },
  })
}

export async function destroySession(request: Request): Promise<Response> {
  const session = await sessionStorage.getSession(request.headers.get('Cookie'))
  return redirect('/login', {
    headers: { 'Set-Cookie': await sessionStorage.destroySession(session) },
  })
}

async function getSessionUser(request: Request): Promise<User | null> {
  const session = await sessionStorage.getSession(request.headers.get('Cookie'))
  const userId = session.get('userId')
  if (!userId) return null
  const user = await getUserById(userId)
  if (!user || !user.is_active) return null
  return user
}

export async function requireUser(request: Request): Promise<User> {
  const user = await getSessionUser(request)
  if (!user) {
    const url = new URL(request.url)
    throw redirect(`/login?redirectTo=${encodeURIComponent(url.pathname)}`)
  }
  return user
}

export async function requireRole(request: Request, roles: UserRole[]): Promise<User> {
  const user = await requireUser(request)
  const required = Math.min(...roles.map((r) => ROLE_RANK[r]))
  if (ROLE_RANK[user.role] < required) {
    throw new Response('Forbidden', { status: 403 })
  }
  return user
}
