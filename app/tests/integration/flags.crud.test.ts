import { describe, expect, it } from 'vitest'
import { action as createAction, loader as listLoader } from '../../app/routes/api.flags'
import { action as detailAction, loader as detailLoader } from '../../app/routes/api.flags.$flagId'
import { createAuthedUser } from './helpers'

async function jsonRequest(url: string, init: RequestInit & { cookie: string }) {
  const { cookie, ...rest } = init
  return new Request(url, { ...rest, headers: { ...rest.headers, Cookie: cookie } })
}

describe('flags CRUD API', () => {
  it('creates, lists, patches, and deletes a flag', async () => {
    const { cookie } = await createAuthedUser('editor')

    const createReq = await jsonRequest('http://localhost/api/flags', {
      cookie,
      method: 'POST',
      body: JSON.stringify({ key: 'new-flag', environment: 'production' }),
      headers: { 'Content-Type': 'application/json' },
    })
    const createRes = (await createAction({ request: createReq, params: {}, context: {} })) as Response
    expect(createRes.status).toBe(201)
    const { flag } = await createRes.json()
    expect(flag.key).toBe('new-flag')

    const listReq = await jsonRequest('http://localhost/api/flags?environment=production', { cookie, method: 'GET' })
    const listRes = (await listLoader({ request: listReq, params: {}, context: {} })) as Response
    const { flags } = await listRes.json()
    expect(flags).toHaveLength(1)

    const patchReq = await jsonRequest(`http://localhost/api/flags/${flag.id}`, {
      cookie,
      method: 'PATCH',
      body: JSON.stringify({ enabled: true }),
      headers: { 'Content-Type': 'application/json' },
    })
    const patchRes = (await detailAction({ request: patchReq, params: { flagId: flag.id }, context: {} })) as Response
    const { flag: patched } = await patchRes.json()
    expect(patched.enabled).toBe(true)

    const getReq = await jsonRequest(`http://localhost/api/flags/${flag.id}`, { cookie, method: 'GET' })
    const getRes = (await detailLoader({ request: getReq, params: { flagId: flag.id }, context: {} })) as Response
    expect((await getRes.json()).flag.enabled).toBe(true)

    const deleteReq = await jsonRequest(`http://localhost/api/flags/${flag.id}`, { cookie, method: 'DELETE' })
    const deleteRes = (await detailAction({ request: deleteReq, params: { flagId: flag.id }, context: {} })) as Response
    expect(deleteRes.status).toBe(200)
  })

  it('enforces the (key, environment) unique constraint with a 409', async () => {
    const { cookie } = await createAuthedUser('editor')

    async function create() {
      const req = await jsonRequest('http://localhost/api/flags', {
        cookie,
        method: 'POST',
        body: JSON.stringify({ key: 'dup-flag', environment: 'production' }),
        headers: { 'Content-Type': 'application/json' },
      })
      return createAction({ request: req, params: {}, context: {} }) as Promise<Response>
    }

    const first = await create()
    expect(first.status).toBe(201)

    const second = await create()
    expect(second.status).toBe(409)
  })
})
