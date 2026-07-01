import { getRemainingDeployableBudget } from './budget'
import { getNextSuggestedOperationDate } from './schedule'

function roundToTwo(value) {
  return Number((Number(value) || 0).toFixed(2))
}

function toDateLabel(value) {
  return String(value || '').slice(0, 10)
}

function getLatestRecord(planId, records = []) {
  return (Array.isArray(records) ? records : [])
    .filter((record) => record.planId === planId)
    .slice()
    .sort((left, right) => {
      if (left.periodIndex !== right.periodIndex) {
        return right.periodIndex - left.periodIndex
      }

      return String(right.date || '').localeCompare(String(left.date || ''))
    })[0] || null
}

function getTodayLabel(now = new Date()) {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getSuggestedDateState(suggestedDate, now = new Date()) {
  const dateLabel = String(suggestedDate || '')
  if (!dateLabel) {
    return 'unknown'
  }

  const today = getTodayLabel(now)
  if (dateLabel < today) {
    return 'overdue'
  }

  if (dateLabel === today) {
    return 'today'
  }

  return 'upcoming'
}

export function getPlanSnapshot(plan, records = [], now = new Date()) {
  if (!plan) {
    return null
  }

  const planRecords = (Array.isArray(records) ? records : [])
    .filter((record) => record.planId === plan.id)
    .slice()
    .sort((left, right) => left.periodIndex - right.periodIndex)
  const latestRecord = getLatestRecord(plan.id, records)
  const latestPriceMap = Object.fromEntries((latestRecord?.assets || []).map((asset) => [asset.ticker, Number(asset.price) || 0]))
  const totalInvested = Number(latestRecord?.cumulativeInvested) || 0
  const marketValue = roundToTwo(
    (plan.assets || []).reduce(
      (sum, asset) => sum + ((Number(asset.currentShares) || 0) * (latestPriceMap[asset.ticker] || 0)),
      0,
    ),
  )
  const floatingProfit = roundToTwo(marketValue - totalInvested)
  const nextSuggestedDate = getNextSuggestedOperationDate(plan, records, now)

  return {
    id: plan.id,
    name: plan.name || '未命名计划',
    strategy: plan.strategy,
    frequency: plan.frequency,
    budgetMode: plan.budgetMode,
    currentPeriod: Number(plan.currentPeriod) || 0,
    totalPeriods: Number(plan.totalPeriods) || 0,
    assetCount: Array.isArray(plan.assets) ? plan.assets.length : 0,
    recordCount: planRecords.length,
    latestRecordDate: latestRecord ? toDateLabel(latestRecord.date) : '',
    latestTag: latestRecord?.tag || '',
    nextSuggestedDate,
    nextSuggestedState: getSuggestedDateState(nextSuggestedDate, now),
    totalInvested,
    marketValue,
    floatingProfit,
    floatingProfitPct: totalInvested > 0 ? roundToTwo((floatingProfit / totalInvested) * 100) : 0,
    remainingBudget: Math.max(0, getRemainingDeployableBudget(plan, totalInvested)),
    hasRecords: Boolean(latestRecord),
    isOpenEnded: plan.budgetMode === 'open-ended',
  }
}

export function getPortfolioSnapshot(plans = [], records = [], now = new Date()) {
  const planSnapshots = (Array.isArray(plans) ? plans : [])
    .map((plan) => getPlanSnapshot(plan, records, now))
    .filter(Boolean)

  const nearestSuggestedDate = planSnapshots
    .map((snapshot) => snapshot.nextSuggestedDate)
    .filter(Boolean)
    .sort()[0] || ''

  return {
    planSnapshots,
    planCount: planSnapshots.length,
    totalRecords: (Array.isArray(records) ? records : []).length,
    totalInvested: roundToTwo(planSnapshots.reduce((sum, snapshot) => sum + snapshot.totalInvested, 0)),
    totalMarketValue: roundToTwo(planSnapshots.reduce((sum, snapshot) => sum + snapshot.marketValue, 0)),
    totalFloatingProfit: roundToTwo(planSnapshots.reduce((sum, snapshot) => sum + snapshot.floatingProfit, 0)),
    duePlanCount: planSnapshots.filter((snapshot) => snapshot.nextSuggestedState === 'today' || snapshot.nextSuggestedState === 'overdue').length,
    openEndedPlanCount: planSnapshots.filter((snapshot) => snapshot.isOpenEnded).length,
    nearestSuggestedDate,
  }
}
