import { describe, expect, it } from 'vitest'
import { MAX_BACKOFF_MS, nextBackoff } from '../src/backoff'

describe('nextBackoff', () => {
  it('doubles the current backoff', () => {
    expect(nextBackoff(1000)).toBe(2000)
    expect(nextBackoff(2000)).toBe(4000)
  })

  it('caps at the max backoff', () => {
    expect(nextBackoff(20000)).toBe(MAX_BACKOFF_MS)
    expect(nextBackoff(100000)).toBe(MAX_BACKOFF_MS)
  })

  it('respects a custom max', () => {
    expect(nextBackoff(4000, 5000)).toBe(5000)
  })
})
