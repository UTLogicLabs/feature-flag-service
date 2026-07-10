export type UserRole = 'admin' | 'editor' | 'viewer'

export type User = {
  id: string
  email: string
  password_hash: string
  role: UserRole
  is_active: boolean
  created_at: string
}
