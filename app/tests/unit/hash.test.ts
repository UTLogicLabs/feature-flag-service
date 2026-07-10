import { describe, expect, it } from 'vitest'
import { fnv1a, isInRollout } from '../../app/lib/hash.server'

describe('fnv1a', () => {
  it('is deterministic for the same input', () => {
    expect(fnv1a('hello')).toBe(fnv1a('hello'))
  })

  it('matches a known vector', () => {
    expect(fnv1a('')).toBe(0x811c9dc5)
    expect(fnv1a('a')).toBe(0xe40c292c)
  })

  it('differs for different inputs', () => {
    expect(fnv1a('flag:user1')).not.toBe(fnv1a('flag:user2'))
  })
})

describe('isInRollout', () => {
  it('never matches at 0%', () => {
    for (let i = 0; i < 200; i++) {
      expect(isInRollout('flag', `user-${i}`, 0)).toBe(false)
    }
  })

  it('always matches at 100%', () => {
    for (let i = 0; i < 200; i++) {
      expect(isInRollout('flag', `user-${i}`, 100)).toBe(true)
    }
  })

  it('is stable for the same flag/user/percentage across calls', () => {
    const result1 = isInRollout('checkout-flow', 'user-42', 50)
    const result2 = isInRollout('checkout-flow', 'user-42', 50)
    expect(result1).toBe(result2)
  })

  it('bucket boundary is percentage * 100', () => {
    const bucket = fnv1a('flag:userX') % 10000
    expect(isInRollout('flag', 'userX', bucket / 100)).toBe(false)
    expect(isInRollout('flag', 'userX', bucket / 100 + 0.01)).toBe(true)
  })
})
