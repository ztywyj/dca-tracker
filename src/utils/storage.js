const STORAGE_KEYS = {
  plan: 'dca-tracker:plan',
  plans: 'dca-tracker:plans',
  activePlanId: 'dca-tracker:active-plan-id',
  records: 'dca-tracker:records',
}

const RUNTIME_EVENT_NAME = 'dca-tracker:runtime-update'

let persistQueue = Promise.resolve()

function getServerRuntime() {
  if (typeof window === 'undefined') {
    return null
  }

  return window.__DCA_RUNTIME__ && typeof window.__DCA_RUNTIME__ === 'object'
    ? window.__DCA_RUNTIME__
    : null
}

function getServerData() {
  const runtime = getServerRuntime()
  const data = runtime?.initialData
  return data && typeof data === 'object' ? data : null
}

function hasServerRuntime() {
  return Boolean(getServerRuntime())
}

function createBrowserMeta() {
  return {
    mode: 'browser-localStorage',
    storageDir: 'Current browser localStorage',
    dataFile: 'Current browser localStorage',
    backupDir: 'Use manual export for backups',
    backupCount: 0,
    recoveredFromBackup: false,
    recoveryFile: '',
    recoveryReason: '',
    lastLoadSource: 'browser-localStorage',
    lastSavedAt: '',
  }
}

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readBrowserStorage(key, fallback) {
  if (!canUseBrowserStorage()) {
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

function writeBrowserStorage(key, value) {
  if (!canUseBrowserStorage()) {
    return
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`Failed to write storage key: ${key}`, error)
  }
}

function updateServerRuntime(patch) {
  const runtime = getServerRuntime()
  if (!runtime) {
    return
  }

  Object.assign(runtime, patch)

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(RUNTIME_EVENT_NAME, { detail: runtime }))
  }
}

function enqueuePersist(task) {
  persistQueue = persistQueue
    .catch(() => undefined)
    .then(task)
    .catch((error) => {
      console.error('Failed to persist server-backed storage', error)
    })
}

function handleUnauthorizedResponse(response) {
  if (response.status === 401 && typeof window !== 'undefined') {
    window.location.reload()
    return true
  }

  return false
}

function persistServerValue(key, value) {
  enqueuePersist(async () => {
    const response = await fetch(`/api/storage/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ value }),
    })

    if (handleUnauthorizedResponse(response)) {
      return
    }

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(payload?.error || `Failed to persist ${key}`)
    }

    if (payload?.meta) {
      updateServerRuntime({ storageMeta: payload.meta })
    }
  })
}

function persistServerClear() {
  enqueuePersist(async () => {
    const response = await fetch('/api/storage', {
      method: 'DELETE',
    })

    if (handleUnauthorizedResponse(response)) {
      return
    }

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(payload?.error || 'Failed to clear server-backed storage')
    }

    if (payload?.meta) {
      updateServerRuntime({ storageMeta: payload.meta })
    }
  })
}

function readStorage(key, fallback) {
  const serverData = getServerData()

  if (serverData) {
    return serverData[key] === undefined ? fallback : serverData[key]
  }

  if (hasServerRuntime()) {
    return fallback
  }

  return readBrowserStorage(key, fallback)
}

function writeStorage(key, value) {
  const runtime = getServerRuntime()
  const serverData = getServerData()

  if (runtime && serverData) {
    updateServerRuntime({
      initialData: {
        ...serverData,
        [key]: value,
      },
    })
    persistServerValue(key, value)
    return
  }

  if (runtime) {
    return
  }

  writeBrowserStorage(key, value)
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
  const runtime = getServerRuntime()
  const serverData = getServerData()

  if (runtime && serverData) {
    updateServerRuntime({
      initialData: {
        [STORAGE_KEYS.plan]: null,
        [STORAGE_KEYS.plans]: [],
        [STORAGE_KEYS.activePlanId]: null,
        [STORAGE_KEYS.records]: [],
      },
    })
    persistServerClear()
    return
  }

  if (runtime) {
    return
  }

  if (!canUseBrowserStorage()) {
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

export function getStorageMeta() {
  return getServerRuntime()?.storageMeta || createBrowserMeta()
}

export function getRuntimeInfo() {
  return getServerRuntime() || {}
}

export function subscribeStorageMeta(listener) {
  if (typeof window === 'undefined' || typeof listener !== 'function') {
    return () => {}
  }

  const handleRuntimeUpdate = (event) => {
    listener(event?.detail?.storageMeta || getStorageMeta())
  }

  window.addEventListener(RUNTIME_EVENT_NAME, handleRuntimeUpdate)
  return () => {
    window.removeEventListener(RUNTIME_EVENT_NAME, handleRuntimeUpdate)
  }
}

export { STORAGE_KEYS, readStorage, writeStorage }
