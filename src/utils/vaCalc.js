import { getDeployableBudget } from './budget'

const OPEN_ENDED_PLACEHOLDER_PERIODS = 9999

function roundToTwo(value) {
  return Number((Number(value) || 0).toFixed(2))
}

function getPeriodsPerYear(frequency = 'monthly') {
  return frequency === 'biweekly' ? 24 : 12
}

function isOpenEndedPlan(plan = {}) {
  return plan?.budgetMode === 'open-ended'
}

function getPeriodicGrowthRate(plan = {}) {
  return (Number(plan.targetAnnualReturn) || 0) / getPeriodsPerYear(plan.frequency)
}

function getAssetPeriodicContribution(assetWeight, plan = {}) {
  if (isOpenEndedPlan(plan)) {
    return roundToTwo((Number(plan.periodicTarget) || 0) * (Number(assetWeight) || 0))
  }

  const deployableBudget = getDeployableBudget(plan)
  const totalPeriods = Math.max(1, Number(plan.totalPeriods) || 1)
  return roundToTwo((deployableBudget * (Number(assetWeight) || 0)) / totalPeriods)
}

function getInitialTargetValue(assetWeight, plan = {}) {
  return getAssetPeriodicContribution(assetWeight, plan)
}

export function getTargetValue(periodIndex, assetWeight, plan = {}) {
  const normalizedPeriodIndex = Math.max(0, Number(periodIndex) || 0)
  const normalizedAssetWeight = Number(assetWeight) || 0
  const growthRate = getPeriodicGrowthRate(plan)

  if (isOpenEndedPlan(plan)) {
    const periodicContribution = getAssetPeriodicContribution(normalizedAssetWeight, plan)

    if (normalizedPeriodIndex === 0) {
      return roundToTwo(periodicContribution)
    }

    let target = periodicContribution
    for (let index = 1; index <= normalizedPeriodIndex; index += 1) {
      target = target * (1 + growthRate) + periodicContribution
    }

    return roundToTwo(target)
  }

  const firstTarget = getInitialTargetValue(normalizedAssetWeight, plan)

  if (normalizedPeriodIndex === 0) {
    return firstTarget
  }

  const periodicContribution = getAssetPeriodicContribution(normalizedAssetWeight, plan)
  let target = firstTarget

  for (let index = 1; index <= normalizedPeriodIndex; index += 1) {
    target = target * (1 + growthRate) + periodicContribution
  }

  return roundToTwo(target)
}

export function getRequiredInvestment(currentValue, targetValue) {
  return roundToTwo(Math.max(0, (Number(targetValue) || 0) - (Number(currentValue) || 0)))
}

export function getSuggestedShares(requiredAmount, currentPrice) {
  const price = Number(currentPrice) || 0
  if (price <= 0) return 0
  return Math.round((Number(requiredAmount) || 0) / price)
}

export function getUpdatedShares(previousShares, actualSharesBought) {
  return roundToTwo((Number(previousShares) || 0) + (Number(actualSharesBought) || 0))
}

export function calcAllTargets(plan = {}) {
  const totalPeriods = isOpenEndedPlan(plan)
    ? Math.max(Number(plan.currentPeriod) || 0, OPEN_ENDED_PLACEHOLDER_PERIODS)
    : Math.max(0, Number(plan.totalPeriods) || 0)
  const assets = Array.isArray(plan.assets) ? plan.assets : []

  return Array.from({ length: totalPeriods }, (_, periodIndex) =>
    assets.map((asset) => getTargetValue(periodIndex, Number(asset.weight) || 0, plan)),
  )
}

export function calculateVaRecommendation({
  targetValue = 0,
  currentValue = 0,
  price = 0,
}) {
  const requiredAmount = getRequiredInvestment(currentValue, targetValue)

  return {
    suggestedAmount: requiredAmount,
    suggestedShares: getSuggestedShares(requiredAmount, price),
    gap: roundToTwo((Number(targetValue) || 0) - (Number(currentValue) || 0)),
  }
}

export { getInitialTargetValue }
