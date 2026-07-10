import type { LoaderFunctionArgs } from '@remix-run/node'
import { evaluateForEnvironment } from '../lib/repositories/flags.server'
import { ensureListening, registerSseConnection, unregisterSseConnection } from '../lib/notify.server'

const MAX_CONTEXT_BYTES = 4096
const HEARTBEAT_INTERVAL_MS = 20000
const heartbeats = new Map<string, ReturnType<typeof setInterval>>()

export async function loader({ request }: LoaderFunctionArgs) {
  ensureListening()

  const url = new URL(request.url)
  const environment = url.searchParams.get('environment') ?? 'production'
  const rawContext = url.searchParams.get('context') ?? '{}'

  if (rawContext.length > MAX_CONTEXT_BYTES) {
    return new Response('context payload too large', { status: 413 })
  }

  let context: Record<string, unknown>
  try {
    context = JSON.parse(rawContext)
  } catch {
    return new Response('invalid context', { status: 400 })
  }

  const connectionId = crypto.randomUUID()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: string) => {
        controller.enqueue(encoder.encode(`event: message\ndata: ${data}\n\n`))
      }

      const initialFlagMap = await evaluateForEnvironment(environment, context)
      send(JSON.stringify(initialFlagMap))

      registerSseConnection(connectionId, {
        environment,
        context,
        send,
        lastFlagMap: initialFlagMap,
      })

      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'))
        } catch {
          clearInterval(heartbeat)
        }
      }, HEARTBEAT_INTERVAL_MS)
      heartbeat.unref?.()
      heartbeats.set(connectionId, heartbeat)

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        heartbeats.delete(connectionId)
        unregisterSseConnection(connectionId)
        try {
          controller.close()
        } catch {
          // already closed
        }
      })
    },
    cancel() {
      const heartbeat = heartbeats.get(connectionId)
      if (heartbeat) clearInterval(heartbeat)
      heartbeats.delete(connectionId)
      unregisterSseConnection(connectionId)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
