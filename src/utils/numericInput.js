export function normalizeNumericInput(value, options = {}) {
  const { decimalPlaces = 2, integerOnly = false, allowNegative = false } = options

  if (value === '' || value === null || value === undefined) {
    return ''
  }

  const rawText = String(value)
    .replaceAll(',', '')
  const isNegative = allowNegative && rawText.trim().startsWith('-')
  const text = rawText.replace(/[^\d.]/g, '')

  if (!text) {
    return isNegative ? '-' : ''
  }

  const hasDecimalPoint = text.includes('.')
  const [rawIntegerPart = '', ...fractionParts] = text.split('.')
  let integerPart = rawIntegerPart
  let fractionPart = fractionParts.join('')
  const signPrefix = isNegative ? '-' : ''

  if (text.startsWith('.')) {
    integerPart = '0'
  }

  integerPart = integerPart === '' ? '0' : integerPart.replace(/^0+(?=\d)/, '')

  if (integerOnly || decimalPlaces <= 0 || !hasDecimalPoint) {
    return `${signPrefix}${integerPart}`
  }

  fractionPart = fractionPart.slice(0, decimalPlaces)

  if (text.endsWith('.') && fractionPart === '') {
    return `${signPrefix}${integerPart}.`
  }

  return fractionPart === '' ? `${signPrefix}${integerPart}` : `${signPrefix}${integerPart}.${fractionPart}`
}

export function formatNumericInput(value, options = {}) {
  const { decimalPlaces = 2, integerOnly = false, allowNegative = false } = options
  const normalized = normalizeNumericInput(value, { decimalPlaces, integerOnly, allowNegative })

  if (normalized === '' || normalized === '-') {
    return ''
  }

  if (normalized.endsWith('.')) {
    return normalized.slice(0, -1)
  }

  const numeric = Number(normalized)

  if (!Number.isFinite(numeric)) {
    return ''
  }

  if (integerOnly) {
    return String(Math.trunc(numeric))
  }

  return numeric.toFixed(decimalPlaces).replace(/\.?0+$/, '')
}

export function toNumberOrFallback(value, fallback = 0) {
  if (value === '' || value === null || value === undefined) {
    return fallback
  }

  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}
