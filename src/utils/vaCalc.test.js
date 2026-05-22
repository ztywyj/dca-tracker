import { describe, expect, it } from 'vitest'
import { getInitialTargetValue, getTargetValue, getRequiredInvestment } from './vaCalc'

describe('vaCalc', () => {
  const monthlyPlan = {
    strategy: 'VA',
    budgetMode: 'fixed',
    totalBudget: 50000,
    reserveRatio: 0.2,
    totalPeriods: 12,
    frequency: 'monthly',
    targetAnnualReturn: 0.2,
    assets: [
      { ticker: 'QLD', weight: 0.5 },
      { ticker: 'IBIT', weight: 0.5 },
    ],
  }

  it('uses DCA-sized target for the first VA period', () => {
    expect(getInitialTargetValue(0.5, monthlyPlan)).toBe(1666.67)
    expect(getTargetValue(0, 0.5, monthlyPlan)).toBe(1666.67)
  })

  it('starts VA growth from the second period', () => {
    expect(getTargetValue(1, 0.5, monthlyPlan)).toBe(3361.12)
  })

  it('computes required investment from current value gap', () => {
    expect(getRequiredInvestment(3000, getTargetValue(1, 0.5, monthlyPlan))).toBe(361.12)
  })
})
