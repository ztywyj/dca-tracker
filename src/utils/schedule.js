function pad(value) {
  return String(value).padStart(2, '0')
}

function parseDateParts(value) {
  const matched = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!matched) {
    return null
  }

  return {
    year: Number(matched[1]),
    month: Number(matched[2]),
    day: Number(matched[3]),
  }
}

function formatDateParts(parts) {
  if (!parts) {
    return ''
  }

  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

function getTodayParts(now = new Date()) {
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  }
}

function getDaysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function addDays(parts, days) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
  date.setUTCDate(date.getUTCDate() + days)

  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

function addMonthsClamped(parts, months) {
  const totalMonths = (parts.year * 12) + (parts.month - 1) + months
  const nextYear = Math.floor(totalMonths / 12)
  const nextMonth = (totalMonths % 12) + 1
  const nextDay = Math.min(parts.day, getDaysInMonth(nextYear, nextMonth))

  return {
    year: nextYear,
    month: nextMonth,
    day: nextDay,
  }
}

export function getNextSuggestedDateFromBase(baseDate, frequency = 'monthly') {
  const baseParts = parseDateParts(baseDate)

  if (!baseParts) {
    return ''
  }

  return formatDateParts(
    frequency === 'biweekly'
      ? addDays(baseParts, 14)
      : addMonthsClamped(baseParts, 1),
  )
}

export function getNextSuggestedOperationDate(plan, records = [], now = new Date()) {
  if (!plan) {
    return ''
  }

  const planRecords = (Array.isArray(records) ? records : [])
    .filter((record) => record.planId === plan.id)
    .filter((record) => record.tag !== 'rebalance')
    .slice()
    .sort((left, right) => {
      if (left.periodIndex !== right.periodIndex) {
        return right.periodIndex - left.periodIndex
      }

      return String(right.date || '').localeCompare(String(left.date || ''))
    })

  if (!planRecords.length) {
    return formatDateParts(getTodayParts(now))
  }

  return getNextSuggestedDateFromBase(planRecords[0]?.date, plan.frequency)
}
