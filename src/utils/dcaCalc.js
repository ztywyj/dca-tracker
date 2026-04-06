const DEFAULT_RESERVE_RATIO = 0.2

function roundToTwo(value) {
  return Number((Number(value) || 0).toFixed(2))
}

function getDeployableBudget(plan = {}) {
  const totalBudget = Number(plan.totalBudget) || 0
  const reserveRatio = Number.isFinite(Number(plan.reserveRatio)) ? Number(plan.reserveRatio) : DEFAULT_RESERVE_RATIO
  return totalBudget * (1 - reserveRatio)
}

export function getPeriodicAmount(plan = {}, assetWeight = 0) {
  const deployableBudget = getDeployableBudget(plan)
  const totalPeriods = Math.max(1, Number(plan.totalPeriods) || 1)
  return roundToTwo((deployableBudget * (Number(assetWeight) || 0)) / totalPeriods)
}

export function getSuggestedShares(periodicAmount, currentPrice) {
  const price = Number(currentPrice) || 0
  if (price <= 0) return 0
  return Math.round((Number(periodicAmount) || 0) / price)
}

export function calculateDcaProjection({ amount = 0, price = 0 }) {
  const periodicAmount = roundToTwo(amount)
  return {
    shares: getSuggestedShares(periodicAmount, price),
    estimatedCost: periodicAmount,
  }
}
