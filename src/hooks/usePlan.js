import { useMemo, useState } from 'react'
import { loadPlan, savePlan } from '../utils/storage'

const defaultPlan = null

function createEmptyPlan() {
  return {
    id: '',
    name: '',
    strategy: 'VA',
    totalBudget: 10000,
    reserveRatio: 0.2,
    totalPeriods: 24,
    currentPeriod: 0,
    frequency: 'monthly',
    targetAnnualReturn: 0.25,
    assets: [],
    createdAt: '',
  }
}

export function usePlan() {
  const [plan, setPlan] = useState(() => loadPlan())

  const updatePlan = (nextValue) => {
    setPlan((current) => {
      const safeCurrent = current ?? createEmptyPlan()
      const nextPlan = typeof nextValue === 'function' ? nextValue(safeCurrent) : { ...safeCurrent, ...nextValue }
      savePlan(nextPlan)
      return nextPlan
    })
  }

  const replacePlan = (nextPlan) => {
    savePlan(nextPlan)
    setPlan(nextPlan)
  }

  const resetPlan = () => {
    setPlan(null)
  }

  return useMemo(
    () => ({
      plan,
      updatePlan,
      replacePlan,
      resetPlan,
      defaultPlan,
      createEmptyPlan,
    }),
    [plan],
  )
}
