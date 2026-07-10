export const INITIAL_BACKOFF_MS = 1000
export const MAX_BACKOFF_MS = 30000

export function nextBackoff(current: number, max: number = MAX_BACKOFF_MS): number {
  return Math.min(current * 2, max)
}
