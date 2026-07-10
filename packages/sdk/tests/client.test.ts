import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFlagClient } from '../src/index'

class FakeEventSource {
  static instances: FakeEventSource[] = []
  url: string
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  closed = false

  constructor(url: string) {
    this.url = url
    FakeEventSource.instances.push(this)
  }

  emitMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) })
  }

  emitError() {
    this.onerror?.()
  }

  close() {
    this.closed = true
  }
}

beforeEach(() => {
  FakeEventSource.instances = []
  vi.useFakeTimers()
  // @ts-expect-error test double
  global.EventSource = FakeEventSource
})

afterEach(() => {
  vi.useRealTimers()
})

describe('createFlagClient', () => {
  it('reflects the latest onmessage payload', () => {
    const client = createFlagClient({ userId: 'u1' })
    const es = FakeEventSource.instances[0]
    es.emitMessage({ 'my-flag': true })
    expect(client.isEnabled('my-flag')).toBe(true)
    es.emitMessage({ 'my-flag': false })
    expect(client.isEnabled('my-flag')).toBe(false)
    client.close()
  })

  it('retains the last cached value across onerror ("stay as you were")', () => {
    const client = createFlagClient({ userId: 'u1' })
    const es = FakeEventSource.instances[0]
    es.emitMessage({ 'my-flag': true })
    es.emitError()
    expect(client.isEnabled('my-flag')).toBe(true)
    client.close()
  })

  it('attempts reconnect with increasing delay after repeated errors', () => {
    const client = createFlagClient({ userId: 'u1' })
    expect(FakeEventSource.instances).toHaveLength(1)

    FakeEventSource.instances[0].emitError()
    vi.advanceTimersByTime(999)
    expect(FakeEventSource.instances).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(FakeEventSource.instances).toHaveLength(2)

    FakeEventSource.instances[1].emitError()
    vi.advanceTimersByTime(1999)
    expect(FakeEventSource.instances).toHaveLength(2)
    vi.advanceTimersByTime(1)
    expect(FakeEventSource.instances).toHaveLength(3)

    client.close()
  })

  it('resets backoff to the initial value after a successful message', () => {
    const client = createFlagClient({ userId: 'u1' })
    FakeEventSource.instances[0].emitError()
    vi.advanceTimersByTime(1000)
    FakeEventSource.instances[1].emitMessage({ a: true })
    FakeEventSource.instances[1].emitError()
    vi.advanceTimersByTime(999)
    expect(FakeEventSource.instances).toHaveLength(2)
    vi.advanceTimersByTime(1)
    expect(FakeEventSource.instances).toHaveLength(3)
    client.close()
  })

  it('does not reconnect after close()', () => {
    const client = createFlagClient({ userId: 'u1' })
    client.close()
    FakeEventSource.instances[0].emitError()
    vi.advanceTimersByTime(60000)
    expect(FakeEventSource.instances).toHaveLength(1)
  })
})
