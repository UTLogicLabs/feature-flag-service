import pg from 'pg'
import { evaluateForEnvironment } from './repositories/flags.server'
import type { FlagMap } from '../types/flag'
import type { UserContext } from './evaluation.server'

type RegistryEntry = {
  environment: string
  context: UserContext
  send: (data: string) => void
  lastFlagMap: FlagMap
}

declare global {
  var __featureFlagsListenClient: pg.Client | undefined
  var __featureFlagsSseRegistry: Map<string, RegistryEntry> | undefined
}

export const sseRegistry: Map<string, RegistryEntry> =
  global.__featureFlagsSseRegistry ?? new Map<string, RegistryEntry>()
global.__featureFlagsSseRegistry = sseRegistry

function shallowFlagMapsDiffer(a: FlagMap, b: FlagMap): boolean {
  const aKeys = Object.keys(a)
  const bKeys = Object.keys(b)
  if (aKeys.length !== bKeys.length) return true
  return aKeys.some((key) => a[key] !== b[key])
}

async function handleNotification(payload: string | undefined) {
  if (!payload) return
  let parsed: { key: string; environment: string }
  try {
    parsed = JSON.parse(payload)
  } catch {
    return
  }

  for (const entry of sseRegistry.values()) {
    if (entry.environment !== parsed.environment) continue
    const newFlagMap = await evaluateForEnvironment(entry.environment, entry.context)
    if (shallowFlagMapsDiffer(entry.lastFlagMap, newFlagMap)) {
      entry.send(JSON.stringify(newFlagMap))
      entry.lastFlagMap = newFlagMap
    }
  }
}

export function ensureListening(): void {
  if (global.__featureFlagsListenClient) return

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL })
  global.__featureFlagsListenClient = client

  client.on('notification', (msg) => {
    void handleNotification(msg.payload)
  })

  client.on('error', (err) => {
    console.error('flag_changes LISTEN connection error', err)
  })

  void client.connect().then(() => client.query('LISTEN flag_changes'))
}

export function registerSseConnection(id: string, entry: RegistryEntry): void {
  sseRegistry.set(id, entry)
}

export function unregisterSseConnection(id: string): void {
  sseRegistry.delete(id)
}
