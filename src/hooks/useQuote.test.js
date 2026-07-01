import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchQuote } from './useQuote'

describe('fetchQuote', () => {
  const originalWindow = globalThis.window

  afterEach(() => {
    if (originalWindow === undefined) {
      delete globalThis.window
    } else {
      globalThis.window = originalWindow
    }

    vi.restoreAllMocks()
  })

  it('fetches quotes from the local quote endpoint without relying on AbortSignal.timeout', async () => {
    const originalTimeout = AbortSignal.timeout
    AbortSignal.timeout = undefined
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ price: '123.456' }),
    })

    const result = await fetchQuote('qld')

    expect(result).toEqual({
      price: 123.46,
      error: '',
    })
    expect(fetchSpy).toHaveBeenCalledWith('/api/quote?symbol=QLD', {
      signal: expect.any(AbortSignal),
    })

    AbortSignal.timeout = originalTimeout
  })

  it('reports missing server api key from runtime config without calling fetch', async () => {
    globalThis.window = {
      __DCA_RUNTIME__: {
        quoteApiEnabled: false,
      },
    }

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const result = await fetchQuote('qld')

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.price).toBeNull()
    expect(result.error).toContain('TWELVE_DATA_KEY')
  })
})
