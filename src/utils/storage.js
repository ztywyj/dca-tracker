const STORAGE_KEYS = {
  plan: 'dca-tracker:plan',
  plans: 'dca-tracker:plans',
  activePlanId: 'dca-tracker:active-plan-id',
  records: 'dca-tracker:records',
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readStorage(key, fallback) {
  if (!canUseStorage()) {
    return fallback
  }

  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch (error) {
    console.error(`Failed to read storage key: ${key}`, error)
    return fallback
  }
}

function writeStorage(key, value) {
  if (!canUseStorage()) {
    return
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Failed to write storage key: ${key}`, error)
  }
}

export function savePlan(plan) {
  writeStorage(STORAGE_KEYS.plan, plan)
}

export function loadPlan() {
  return readStorage(STORAGE_KEYS.plan, null)
}

export function savePlans(plans) {
  writeStorage(STORAGE_KEYS.plans, Array.isArray(plans) ? plans : [])
}

export function loadPlans() {
  return readStorage(STORAGE_KEYS.plans, [])
}

export function saveActivePlanId(activePlanId) {
  writeStorage(STORAGE_KEYS.activePlanId, activePlanId || null)
}

export function loadActivePlanId() {
  return readStorage(STORAGE_KEYS.activePlanId, null)
}

export function saveRecords(records) {
  writeStorage(STORAGE_KEYS.records, Array.isArray(records) ? records : [])
}

export function loadRecords() {
  return readStorage(STORAGE_KEYS.records, [])
}

export function clearAll() {
  if (!canUseStorage()) {
    return
  }

  try {
    window.localStorage.removeItem(STORAGE_KEYS.plan)
    window.localStorage.removeItem(STORAGE_KEYS.plans)
    window.localStorage.removeItem(STORAGE_KEYS.activePlanId)
    window.localStorage.removeItem(STORAGE_KEYS.records)
  } catch (error) {
    console.error('Failed to clear storage', error)
  }
}

export { STORAGE_KEYS, readStorage, writeStorage }
