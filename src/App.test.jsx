import { describe, expect, it } from 'vitest'
import { getImportState, rebuildPlanState, removePlanData } from './App'

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
        initialAverageCost: 80,
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
    expect(nextPlan.assets[0].initialAverageCost).toBe(80)
    expect(nextPlan.assets[0].currentShares).toBe(12)
    expect(nextPlan.currentPeriod).toBe(1)
    expect(nextRecords[0].remainingBudget).toBe(7800)
  })

  it('recalculates remaining budget when fixed plan budget settings change', () => {
    const updatedPlan = {
      ...plan,
      totalBudget: 20000,
      reserveRatio: 0.2,
    }

    const staleRecord = {
      ...firstRecord,
      cumulativeInvested: 200,
      remainingBudget: 7800,
    }

    const { nextRecords } = rebuildPlanState(updatedPlan, [staleRecord])

    expect(nextRecords[0].remainingBudget).toBe(15800)
  })

  it('rebuilds state when one zero-share asset is removed from a record', () => {
    const multiAssetPlan = {
      ...plan,
      currentPeriod: 1,
      assets: [
        {
          ticker: 'QLD',
          name: 'QLD',
          weight: 0.5,
          currentShares: 12,
        },
        {
          ticker: 'IBIT',
          name: 'IBIT',
          weight: 0.5,
          currentShares: 5,
        },
      ],
    }

    const editedRecord = {
      ...firstRecord,
      assets: [
        {
          ticker: 'QLD',
          price: 100,
          actualShares: 2,
          actualAmount: 200,
        },
      ],
    }

    const { nextPlan, nextRecords } = rebuildPlanState(multiAssetPlan, [editedRecord], [editedRecord])

    expect(nextPlan.currentPeriod).toBe(1)
    expect(nextPlan.assets.find((asset) => asset.ticker === 'QLD').currentShares).toBe(12)
    expect(nextPlan.assets.find((asset) => asset.ticker === 'IBIT').currentShares).toBe(5)
    expect(nextRecords[0].assets).toHaveLength(1)
    expect(nextRecords[0].totalActualAmount).toBe(200)
  })

  it('does not advance VA periods when a rebalance record is inserted', () => {
    const vaPlan = {
      ...plan,
      strategy: 'VA',
      totalPeriods: 3,
      currentPeriod: 2,
    }

    const rebalanceRecord = {
      id: 'record-rb',
      planId: 'plan-1',
      periodIndex: 2,
      date: '2026-02-15T00:00:00.000Z',
      tag: 'rebalance',
      assets: [
        {
          ticker: 'QLD',
          price: 100,
          actualShares: -0.5,
          actualAmount: -50,
        },
      ],
      totalActualAmount: -50,
    }

    const thirdRecord = {
      id: 'record-3',
      planId: 'plan-1',
      periodIndex: 2,
      date: '2026-03-01T00:00:00.000Z',
      tag: 'normal',
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

    const { nextPlan, nextRecords } = rebuildPlanState(vaPlan, [firstRecord, rebalanceRecord, thirdRecord])
    const rebuiltRebalance = nextRecords.find((record) => record.id === 'record-rb')
    const rebuiltThirdRecord = nextRecords.find((record) => record.id === 'record-3')

    expect(nextPlan.currentPeriod).toBe(2)
    expect(rebuiltRebalance.periodIndex).toBe(1)
    expect(rebuiltThirdRecord.periodIndex).toBe(1)
  })

  it('extracts all plans and records from a backup payload', () => {
    const secondPlan = {
      ...plan,
      id: 'plan-2',
      name: 'Second plan',
    }

    const payload = {
      plans: [plan, secondPlan],
      activePlanId: 'plan-2',
      records: [firstRecord, { ...secondRecord, planId: 'plan-2' }],
    }

    const { nextPlans, nextActivePlanId, nextRecords } = getImportState(payload)

    expect(nextPlans).toHaveLength(2)
    expect(nextActivePlanId).toBe('plan-2')
    expect(nextRecords).toHaveLength(2)
  })

  it('removes the selected plan and its related history records', () => {
    const secondPlan = {
      ...plan,
      id: 'plan-2',
      name: 'Second plan',
    }

    const { nextPlans, nextRecords, nextActivePlanId } = removePlanData(
      'plan-1',
      [plan, secondPlan],
      [firstRecord, { ...secondRecord, planId: 'plan-2' }],
      'plan-1',
    )

    expect(nextPlans).toEqual([secondPlan])
    expect(nextRecords).toEqual([{ ...secondRecord, planId: 'plan-2' }])
    expect(nextActivePlanId).toBe('plan-2')
  })
})
