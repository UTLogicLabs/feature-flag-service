import bcrypt from 'bcryptjs'
import { query } from '../db.server'
import type { User, UserRole } from '../../types/user'

const BCRYPT_ROUNDS = 12

export async function listUsers(): Promise<User[]> {
  const result = await query<User>('select * from users order by created_at asc')
  return result.rows
}

export async function getUserById(id: string): Promise<User | null> {
  const result = await query<User>('select * from users where id = $1', [id])
  return result.rows[0] ?? null
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await query<User>('select * from users where email = $1', [email])
  return result.rows[0] ?? null
}

export async function createUser(input: { email: string; password: string; role: UserRole }): Promise<User> {
  const password_hash = await bcrypt.hash(input.password, BCRYPT_ROUNDS)
  const result = await query<User>(
    'insert into users (email, password_hash, role) values ($1, $2, $3) returning *',
    [input.email, password_hash, input.role],
  )
  return result.rows[0]
}

export async function verifyPassword(user: User, password: string): Promise<boolean> {
  return bcrypt.compare(password, user.password_hash)
}

export async function setUserRole(id: string, role: UserRole): Promise<User | null> {
  const result = await query<User>('update users set role = $2 where id = $1 returning *', [id, role])
  return result.rows[0] ?? null
}

export async function setUserActive(id: string, is_active: boolean): Promise<User | null> {
  const result = await query<User>('update users set is_active = $2 where id = $1 returning *', [id, is_active])
  return result.rows[0] ?? null
}
