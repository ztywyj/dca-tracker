import { describe, expect, it, vi } from 'vitest'
import { getPlanSnapshot, getPortfolioSnapshot, getSuggestedDateState } from './portfolioSummary'

describe('portfolioSummary helpers', () => {
  const firstPlan = {
    id: 'plan-1',
    name: '核心 ETF',
    strategy: 'DCA',
    budgetMode: 'fixed',
    totalBudget: 10000,
    reserveRatio: 0.2,
    totalPeriods: 12,
    currentPeriod: 2,
    frequency: 'monthly',
    assets: [
      { ticker: 'VOO', currentShares: 10, weight: 1 },
    ],
  }

  const secondPlan = {
    id: 'plan-2',
    name: '双周增强',
    strategy: 'VA',
    budgetMode: 'open-ended',
    totalBudget: 0,
    reserveRatio: 0,
    totalPeriods: 9999,
    currentPeriod: 1,
    frequency: 'biweekly',
    assets: [
      { ticker: 'QLD', currentShares: 4, weight: 1 },
    ],
  }

  const records = [
    {
      id: 'record-1',
      planId: 'plan-1',
      periodIndex: 0,
      date: '2026-01-10T00:00:00.000Z',
      cumulativeInvested: 500,
      assets: [{ ticker: 'VOO', price: 60, actualAmount: 500 }],
    },
    {
      id: 'record-2',
      planId: 'plan-1',
      periodIndex: 1,
      date: '2026-02-10T00:00:00.000Z',
      cumulativeInvested: 900,
      tag: 'normal',
      assets: [{ ticker: 'VOO', price: 100, actualAmount: 400 }],
    },
    {
      id: 'record-3',
      planId: 'plan-2',
      periodIndex: 0,
      date: '2026-06-01T00:00:00.000Z',
      cumulativeInvested: 300,
      tag: 'underweight',
      assets: [{ ticker: 'QLD', price: 90, actualAmount: 300 }],
    },
  ]

  it('builds a plan snapshot with market value and next suggested date', () => {
    const snapshot = getPlanSnapshot(firstPlan, records, new Date('2026-06-27T08:00:00.000Z'))

    expect(snapshot.marketValue).toBe(1000)
    expect(snapshot.totalInvested).toBe(900)
    expect(snapshot.floatingProfit).toBe(100)
    expect(snapshot.latestRecordDate).toBe('2026-02-10')
    expect(snapshot.nextSuggestedDate).toBe('2026-03-10')
  })

  it('aggregates all plans into a portfolio snapshot', () => {
    const portfolio = getPortfolioSnapshot([firstPlan, secondPlan], records, new Date('2026-06-27T08:00:00.000Z'))

    expect(portfolio.planCount).toBe(2)
    expect(portfolio.totalRecords).toBe(3)
    expect(portfolio.totalInvested).toBe(1200)
    expect(portfolio.totalMarketValue).toBe(1360)
    expect(portfolio.totalFloatingProfit).toBe(160)
    expect(portfolio.duePlanCount).toBe(2)
    expect(portfolio.nearestSuggestedDate).toBe('2026-03-10')
  })

  it('classifies suggested date states relative to today', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-27T08:00:00.000Z'))

    expect(getSuggestedDateState('2026-06-26')).toBe('overdue')
    expect(getSuggestedDateState('2026-06-27')).toBe('today')
    expect(getSuggestedDateState('2026-06-28')).toBe('upcoming')

    vi.useRealTimers()
  })
})
