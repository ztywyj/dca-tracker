const HISTORICAL_YIELDS = {
  TQQQ: 0.38,
  QLD: 0.34,
  QQQ: 0.19,
  QQQM: 0.19,
  SPY: 0.14,
  VOO: 0.14,
  IVV: 0.14,
  VTI: 0.14,
  VT: 0.12,
  SPMO: 0.18,
  GOOGL: 0.23,
  GOOG: 0.23,
  // TSLA 的长期 CAGR 很高，主要受到 2019-2021 爆发式上涨显著拉动，历史高收益不代表未来表现。
  TSLA: 0.45,
  'BRK.B': 0.13,
  BRKB: 0.13,
  IBIT: 0.5,
  BITO: 0.45,
  _default: 0.15,
}

const DEFAULT_YIELD = HISTORICAL_YIELDS._default

function roundDownToStep(value, step = 0.05) {
  const numeric = Number(value) || 0
  return Math.floor(numeric / step) * step
}

export function estimateTargetYield(assets = []) {
  const safeAssets = Array.isArray(assets) ? assets : []
  const totalWeight = safeAssets.reduce((sum, asset) => sum + (Number(asset.weight) || 0), 0)

  if (!safeAssets.length || totalWeight <= 0) {
    return {
      estimatedYield: 0.15,
      minYield: 0.1,
      maxYield: 0.2,
      breakdown: [],
    }
  }

  const weightedYield = safeAssets.reduce((sum, asset) => {
    const ticker = String(asset.ticker || '').trim().toUpperCase()
    const weight = Number(asset.weight) || 0
    const referenceYield = HISTORICAL_YIELDS[ticker] ?? DEFAULT_YIELD
    return sum + referenceYield * weight
  }, 0)

  const normalizedYield = weightedYield / totalWeight
  const estimatedYield = Math.max(0.05, roundDownToStep(normalizedYield, 0.05))

  return {
    estimatedYield,
    minYield: Math.max(0.05, estimatedYield - 0.05),
    maxYield: estimatedYield + 0.05,
    breakdown: safeAssets.map((asset) => {
      const ticker = String(asset.ticker || '').trim().toUpperCase()
      return {
        ticker,
        weight: Number(asset.weight) || 0,
        referenceYield: HISTORICAL_YIELDS[ticker] ?? DEFAULT_YIELD,
      }
    }),
  }
}

export { DEFAULT_YIELD, HISTORICAL_YIELDS }
