import { describe, expect, it } from 'vitest'
import { rebuildPlanState } from './App'

describe('rebuildPlanState', () => {
  const plan = {
    id: 'plan-1',
    name: 'Test plan',
    strategy: 'DCA',
    budgetMode: 'fixed',
    totalBudget: 10000,
    reserveRatio: 0.2,
    totalPeriods: 4,
    currentPeriod: 2,
    frequency: 'monthly',
    targetAnnualReturn: 0.2,
    assets: [
      {
        ticker: 'QLD',
        name: 'QLD',
        weight: 1,
        currentShares: 13,
      },
    ],
  }

  const firstRecord = {
    id: 'record-1',
    planId: 'plan-1',
    periodIndex: 0,
    date: '2026-01-01T00:00:00.000Z',
    assets: [
      {
        ticker: 'QLD',
        price: 100,
        actualShares: 2,
        actualAmount: 200,
      },
    ],
    totalActualAmount: 200,
  }

  const secondRecord = {
    id: 'record-2',
    planId: 'plan-1',
    periodIndex: 1,
    date: '2026-02-01T00:00:00.000Z',
    assets: [
      {
        ticker: 'QLD',
        price: 100,
        actualShares: 1,
        actualAmount: 100,
      },
    ],
    totalActualAmount: 100,
  }

  it('preserves initial holdings when rebuilding after record deletion', () => {
    const { nextPlan, nextRecords } = rebuildPlanState(plan, [firstRecord], [firstRecord, secondRecord])

    expect(nextPlan.assets[0].initialShares).toBe(10)
    expect(nextPlan.assets[0].currentShares).toBe(12)
    expect(nextPlan.currentPeriod).toBe(1)
    expect(nextRecords[0].remainingBudget).toBe(7800)
  })
})
