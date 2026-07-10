import { describe, expect, it } from 'vitest'
import { loader as streamLoader } from '../../app/routes/flags.stream'
import { action as detailAction } from '../../app/routes/api.flags.$flagId'
import { createFlag } from '../../app/lib/repositories/flags.server'
import { createAuthedUser } from './helpers'

function decode(chunk: Uint8Array): string {
  return new TextDecoder().decode(chunk)
}

function parseFlagMapFromEvent(raw: string): Record<string, unknown> {
  const dataLine = raw.split('\n').find((line) => line.startsWith('data: '))
  if (!dataLine) throw new Error(`no data line in event: ${raw}`)
  return JSON.parse(dataLine.slice('data: '.length))
}

async function readNextEvent(reader: ReadableStreamDefaultReader<Uint8Array>, timeoutMs: number) {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('timed out waiting for SSE event')), timeoutMs),
  )
  while (true) {
    const result = await Promise.race([reader.read(), timeout])
    if (result.done) throw new Error('stream ended')
    const text = decode(result.value)
    if (text.startsWith('event: message')) return parseFlagMapFromEvent(text)
  }
}

describe('SSE stream push', () => {
  it('sends the initial flag map and pushes an update after a mutation', async () => {
    const flag = await createFlag({ key: 'stream-flag', environment: 'production', enabled: true, default_variant: false })
    const { cookie, user } = await createAuthedUser('editor')

    const streamRequest = new Request(
      `http://localhost/flags/stream?environment=production&context=${encodeURIComponent('{}')}`,
    )
    const response = (await streamLoader({ request: streamRequest, params: {}, context: {} } as any)) as Response
    const reader = response.body!.getReader()

    const initial = await readNextEvent(reader, 5000)
    expect(initial['stream-flag']).toBe(false)

    const patchRequest = new Request(`http://localhost/api/flags/${flag.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ default_variant: true }),
      headers: { 'Content-Type': 'application/json', Cookie: cookie },
    })
    await detailAction({ request: patchRequest, params: { flagId: flag.id }, context: {} } as any)

    const pushed = await readNextEvent(reader, 5000)
    expect(pushed['stream-flag']).toBe(true)

    await reader.cancel()
  })
})
