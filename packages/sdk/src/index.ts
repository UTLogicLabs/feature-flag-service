import { INITIAL_BACKOFF_MS, nextBackoff } from './backoff'

export type FlagMap = Record<string, boolean | string>

export type FlagClient = {
  isEnabled(key: string): boolean
  getVariant(key: string): boolean | string | undefined
  close(): void
}

export function createFlagClient(
  context: Record<string, unknown>,
  opts?: { endpoint?: string },
): FlagClient {
  let cache: FlagMap = {}
  let source: EventSource | null = null
  let backoffMs = INITIAL_BACKOFF_MS
  let closed = false

  function connect() {
    if (closed) return
    const url = `${opts?.endpoint ?? '/flags/stream'}?context=${encodeURIComponent(JSON.stringify(context))}`
    source = new EventSource(url)
    source.onmessage = (event) => {
      backoffMs = INITIAL_BACKOFF_MS
      cache = JSON.parse(event.data)
    }
    source.onerror = () => {
      // "stay as you were": cache is left untouched on disconnect (see docs/ARCHITECTURE.md)
      source?.close()
      if (closed) return
      setTimeout(connect, backoffMs)
      backoffMs = nextBackoff(backoffMs)
    }
  }
  connect()

  return {
    isEnabled(key) {
      return Boolean(cache[key])
    },
    getVariant(key) {
      return cache[key]
    },
    close() {
      closed = true
      source?.close()
    },
  }
}
