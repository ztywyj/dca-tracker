import { describe, expect, it } from 'vitest'
import { getDeployableBudget, getRemainingDeployableBudget } from './budget'

describe('budget helpers', () => {
  it('uses deployable budget after reserve cash for fixed plans', () => {
    const plan = {
      budgetMode: 'fixed',
      totalBudget: 10000,
      reserveRatio: 0.2,
    }

    expect(getDeployableBudget(plan)).toBe(8000)
    expect(getRemainingDeployableBudget(plan, 1250)).toBe(6750)
  })

  it('returns zero remaining budget for open-ended plans', () => {
    expect(getRemainingDeployableBudget({ budgetMode: 'open-ended', totalBudget: 10000 }, 1250)).toBe(0)
  })
})
