import { sessionStorage } from '../../app/lib/auth.server'
import { createUser } from '../../app/lib/repositories/users.server'
import type { UserRole } from '../../app/types/user'

export async function createAuthedUser(role: UserRole, email = `${role}-${crypto.randomUUID()}@test.local`) {
  const user = await createUser({ email, password: 'password123', role })
  const session = await sessionStorage.getSession()
  session.set('userId', user.id)
  const cookie = await sessionStorage.commitSession(session)
  return { user, cookie }
}
