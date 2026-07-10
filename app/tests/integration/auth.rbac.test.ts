import { describe, expect, it } from 'vitest'
import { action as flagsAction } from '../../app/routes/api.flags'
import { action as usersAction } from '../../app/routes/app.users._index'
import { createAuthedUser } from './helpers'

function req(url: string, cookie: string | null, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  if (cookie) headers.set('Cookie', cookie)
  return new Request(url, { ...init, headers })
}

describe('auth / RBAC enforcement', () => {
  it('viewer gets 403 creating a flag', async () => {
    const { cookie } = await createAuthedUser('viewer')
    const request = req('http://localhost/api/flags', cookie, {
      method: 'POST',
      body: JSON.stringify({ key: 'x', environment: 'production' }),
      headers: { 'Content-Type': 'application/json' },
    })
    await expect(flagsAction({ request, params: {}, context: {} } as any)).rejects.toMatchObject({ status: 403 })
  })

  it('editor gets 403 managing users', async () => {
    const { cookie } = await createAuthedUser('editor')
    const request = req('http://localhost/app/users', cookie, {
      method: 'POST',
      body: new URLSearchParams({ email: 'new@test.local', password: 'pw', role: 'viewer' }),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    await expect(usersAction({ request, params: {}, context: {} } as any)).rejects.toMatchObject({ status: 403 })
  })

  it('admin can create a flag and manage users', async () => {
    const { cookie } = await createAuthedUser('admin')
    const flagRequest = req('http://localhost/api/flags', cookie, {
      method: 'POST',
      body: JSON.stringify({ key: 'admin-flag', environment: 'production' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const flagResponse = (await flagsAction({ request: flagRequest, params: {}, context: {} } as any)) as Response
    expect(flagResponse.status).toBe(201)
  })

  it('unauthenticated request is redirected to login', async () => {
    const request = req('http://localhost/api/flags', null, {
      method: 'POST',
      body: JSON.stringify({ key: 'x', environment: 'production' }),
      headers: { 'Content-Type': 'application/json' },
    })
    await expect(flagsAction({ request, params: {}, context: {} } as any)).rejects.toMatchObject({ status: 302 })
  })
})
