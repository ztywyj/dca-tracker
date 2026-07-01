import { getDeployableBudget } from './budget'
import { normalizeShareRoundingStrategy, roundSuggestedShares } from './shareRounding'

function roundToTwo(value) {
  return Number((Number(value) || 0).toFixed(2))
}

export function getPeriodicAmount(plan = {}, assetWeight = 0) {
  if (plan?.budgetMode === 'open-ended') {
    return roundToTwo((Number(plan.periodicTarget) || 0) * (Number(assetWeight) || 0))
  }

  const deployableBudget = getDeployableBudget(plan)
  const totalPeriods = Math.max(1, Number(plan.totalPeriods) || 1)
  return roundToTwo((deployableBudget * (Number(assetWeight) || 0)) / totalPeriods)
}

export function getSuggestedShares(periodicAmount, currentPrice, options = {}) {
  const price = Number(currentPrice) || 0
  if (price <= 0) return 0
  return roundSuggestedShares((Number(periodicAmount) || 0) / price, {
    strategy: normalizeShareRoundingStrategy(options.strategy),
    currentPrice: price,
    referencePrice: options.referencePrice,
  })
}

export function calculateDcaProjection({ amount = 0, price = 0, referencePrice = 0, roundingStrategy = 'nearest' }) {
  const periodicAmount = roundToTwo(amount)
  return {
    shares: getSuggestedShares(periodicAmount, price, {
      strategy: roundingStrategy,
      referencePrice,
    }),
    estimatedCost: periodicAmount,
  }
}
