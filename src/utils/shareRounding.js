const DEFAULT_SHARE_ROUNDING_STRATEGY = 'nearest'

export const SHARE_ROUNDING_OPTIONS = [
  {
    value: 'nearest',
    label: '四舍五入',
    description: '默认整数股建议，执行简单直接。',
  },
  {
    value: 'trend-aware',
    label: '涨跌自适应',
    description: '相对最近一次记录价格，上涨向下取整，下跌向上取整。',
  },
  {
    value: 'floor',
    label: '始终向下',
    description: '更保守，尽量不超过建议金额。',
  },
  {
    value: 'fractional',
    label: '允许碎股',
    description: '保留两位小数，适合支持碎股的券商。',
  },
]

function roundToTwo(value) {
  return Number((Number(value) || 0).toFixed(2))
}

export function normalizeShareRoundingStrategy(value) {
  return SHARE_ROUNDING_OPTIONS.some((option) => option.value === value)
    ? value
    : DEFAULT_SHARE_ROUNDING_STRATEGY
}

export function getShareRoundingLabel(value) {
  return SHARE_ROUNDING_OPTIONS.find((option) => option.value === value)?.label || '四舍五入'
}

export function roundSuggestedShares(rawShares, options = {}) {
  const {
    strategy = DEFAULT_SHARE_ROUNDING_STRATEGY,
    currentPrice = 0,
    referencePrice = 0,
  } = options

  const normalizedStrategy = normalizeShareRoundingStrategy(strategy)
  const numericShares = Number(rawShares) || 0

  if (numericShares <= 0) {
    return 0
  }

  if (normalizedStrategy === 'fractional') {
    return roundToTwo(numericShares)
  }

  if (normalizedStrategy === 'floor') {
    return Math.floor(numericShares)
  }

  if (normalizedStrategy === 'trend-aware') {
    const latestPrice = Number(referencePrice) || 0
    const priceNow = Number(currentPrice) || 0

    if (latestPrice > 0 && priceNow > latestPrice) {
      return Math.floor(numericShares)
    }

    if (latestPrice > 0 && priceNow < latestPrice) {
      return Math.ceil(numericShares)
    }
  }

  return Math.round(numericShares)
}

export { DEFAULT_SHARE_ROUNDING_STRATEGY }
