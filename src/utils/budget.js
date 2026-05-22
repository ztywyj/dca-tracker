const DEFAULT_RESERVE_RATIO = 0.2

function roundToTwo(value) {
  return Number((Number(value) || 0).toFixed(2))
}

export function getReserveRatio(plan = {}) {
  const reserveRatio = Number(plan.reserveRatio)
  return Number.isFinite(reserveRatio) ? reserveRatio : DEFAULT_RESERVE_RATIO
}

export function getDeployableBudget(plan = {}) {
  const totalBudget = Number(plan.totalBudget) || 0
  return roundToTwo(totalBudget * (1 - getReserveRatio(plan)))
}

export function getRemainingDeployableBudget(plan = {}, cumulativeInvested = 0) {
  if (plan?.budgetMode === 'open-ended') {
    return 0
  }

  return roundToTwo(getDeployableBudget(plan) - (Number(cumulativeInvested) || 0))
}
