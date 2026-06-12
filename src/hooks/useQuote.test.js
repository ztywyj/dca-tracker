import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchQuote } from './useQuote'

describe('fetchQuote', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches quotes without relying on AbortSignal.timeout', async () => {
    const originalTimeout = AbortSignal.timeout
    AbortSignal.timeout = undefined
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      json: async () => ({ price: '123.456' }),
    })

    const result = await fetchQuote('qld')

    expect(result).toEqual({
      price: 123.46,
      error: '',
    })
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('symbol=QLD'), {
      signal: expect.any(AbortSignal),
    })

    AbortSignal.timeout = originalTimeout
  })
})
