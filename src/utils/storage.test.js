import { describe, expect, it } from 'vitest'
import { computeHasUnbackedChanges } from './storage'

describe('computeHasUnbackedChanges', () => {
  it('is false when there have been no data changes yet', () => {
    expect(computeHasUnbackedChanges(null, null)).toBe(false)
  })

  it('is true when data changed but a backup has never been made', () => {
    expect(computeHasUnbackedChanges(null, '2026-07-01T00:00:00.000Z')).toBe(true)
  })

  it('is false when the last backup happened after the last change', () => {
    expect(
      computeHasUnbackedChanges('2026-07-05T00:00:00.000Z', '2026-07-01T00:00:00.000Z'),
    ).toBe(false)
  })

  it('is true when data changed again after the last backup', () => {
    expect(
      computeHasUnbackedChanges('2026-07-01T00:00:00.000Z', '2026-07-05T00:00:00.000Z'),
    ).toBe(true)
  })
})
