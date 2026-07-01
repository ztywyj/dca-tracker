import { describe, expect, it, vi } from 'vitest'
import { getNextSuggestedDateFromBase, getNextSuggestedOperationDate } from './schedule'

describe('schedule helpers', () => {
  it('adds 14 days for biweekly plans', () => {
    expect(getNextSuggestedDateFromBase('2026-06-01', 'biweekly')).toBe('2026-06-15')
  })

  it('adds one month and clamps month-end dates for monthly plans', () => {
    expect(getNextSuggestedDateFromBase('2026-01-31', 'monthly')).toBe('2026-02-28')
  })

  it('uses the latest record date when suggesting the next operation date', () => {
    const plan = { id: 'plan-1', frequency: 'monthly' }
    const records = [
      { planId: 'plan-1', periodIndex: 0, date: '2026-01-10T00:00:00.000Z' },
      { planId: 'plan-1', periodIndex: 1, date: '2026-02-10T00:00:00.000Z' },
    ]

    expect(getNextSuggestedOperationDate(plan, records)).toBe('2026-03-10')
  })

  it('ignores rebalance records when suggesting the next operation date', () => {
    const plan = { id: 'plan-1', frequency: 'monthly' }
    const records = [
      { planId: 'plan-1', periodIndex: 0, date: '2026-01-10T00:00:00.000Z', tag: 'normal' },
      { planId: 'plan-1', periodIndex: 1, date: '2026-02-10T00:00:00.000Z', tag: 'normal' },
      { planId: 'plan-1', periodIndex: 2, date: '2026-02-20T00:00:00.000Z', tag: 'rebalance' },
    ]

    expect(getNextSuggestedOperationDate(plan, records)).toBe('2026-03-10')
  })

  it('falls back to today when the plan has no history yet', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-27T08:00:00.000Z'))

    expect(getNextSuggestedOperationDate({ id: 'plan-1', frequency: 'monthly' }, [])).toBe('2026-06-27')

    vi.useRealTimers()
  })
})
