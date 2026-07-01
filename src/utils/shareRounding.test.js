import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SHARE_ROUNDING_STRATEGY,
  getShareRoundingLabel,
  normalizeShareRoundingStrategy,
  roundSuggestedShares,
} from './shareRounding'

describe('shareRounding helpers', () => {
  it('falls back to the default strategy for unknown values', () => {
    expect(normalizeShareRoundingStrategy('unknown-mode')).toBe(DEFAULT_SHARE_ROUNDING_STRATEGY)
  })

  it('rounds to the nearest integer by default', () => {
    expect(roundSuggestedShares(1.6)).toBe(2)
    expect(roundSuggestedShares(1.4)).toBe(1)
  })

  it('rounds down when the floor strategy is selected', () => {
    expect(roundSuggestedShares(1.9, { strategy: 'floor' })).toBe(1)
  })

  it('keeps two decimals when fractional shares are allowed', () => {
    expect(roundSuggestedShares(1.236, { strategy: 'fractional' })).toBe(1.24)
  })

  it('rounds down on price strength and up on weakness for trend-aware mode', () => {
    expect(roundSuggestedShares(1.8, { strategy: 'trend-aware', currentPrice: 105, referencePrice: 100 })).toBe(1)
    expect(roundSuggestedShares(1.2, { strategy: 'trend-aware', currentPrice: 95, referencePrice: 100 })).toBe(2)
  })

  it('falls back to nearest rounding for trend-aware mode without a reference price', () => {
    expect(roundSuggestedShares(1.6, { strategy: 'trend-aware', currentPrice: 105, referencePrice: 0 })).toBe(2)
  })

  it('returns a human-friendly label for the configured strategy', () => {
    expect(getShareRoundingLabel('trend-aware')).toBe('涨跌自适应')
  })
})
