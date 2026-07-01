import { describe, expect, it } from 'vitest'
import { formatNumericInput, normalizeNumericInput, toNumberOrFallback } from './numericInput'

describe('numericInput helpers', () => {
  it('keeps empty strings empty during editing', () => {
    expect(normalizeNumericInput('')).toBe('')
  })

  it('removes leading zero when typing integer text', () => {
    expect(normalizeNumericInput('012')).toBe('12')
  })

  it('preserves decimal input while editing', () => {
    expect(normalizeNumericInput('0.25')).toBe('0.25')
  })

  it('limits decimal input to two places while editing', () => {
    expect(normalizeNumericInput('12.3456')).toBe('12.34')
  })

  it('supports negative decimal input when enabled', () => {
    expect(normalizeNumericInput('-12.3456', { allowNegative: true })).toBe('-12.34')
    expect(formatNumericInput('-12.50', { allowNegative: true })).toBe('-12.5')
  })

  it('supports integer-only normalization', () => {
    expect(normalizeNumericInput('007', { integerOnly: true })).toBe('7')
  })

  it('formats numeric text without trailing zeros', () => {
    expect(formatNumericInput('70.00')).toBe('70')
    expect(formatNumericInput('70.50')).toBe('70.5')
  })

  it('returns fallback for empty values when converting', () => {
    expect(toNumberOrFallback('', 0)).toBe(0)
  })

  it('converts valid numeric text to number', () => {
    expect(toNumberOrFallback('12.5', 0)).toBe(12.5)
  })
})
