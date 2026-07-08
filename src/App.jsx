import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import AuthScreen from './components/AuthScreen'
import Layout from './components/Layout'
import { getPeriodicAmount, getSuggestedShares as getDcaSuggestedShares } from './utils/dcaCalc'
import { calcAllTargets, getRequiredInvestment, getSuggestedShares as getVaSuggestedShares } from './utils/vaCalc'
import { usePlan } from './hooks/usePlan'
import { useRecords } from './hooks/useRecords'
import {
  clearAll,
  getBackupStatus,
  getRuntimeInfo,
  getStorageMeta,
  markBackedUp,
  markDataChanged,
  subscribeStorageMeta,
} from './utils/storage'
import useTheme from './hooks/useTheme'
import { getRemainingDeployableBudget } from './utils/budget'
import { downloadBackupJson } from './utils/backup'

const Dashboard = lazy(() => import('./components/Dashboard'))
const History = lazy(() => import('./components/History'))
const OperationPanel = lazy(() => import('./components/OperationPanel'))
const PortfolioOverview = lazy(() => import('./components/PortfolioOverview'))
const Settings = lazy(() => import('./components/Settings'))

const tabs = {
  portfolio: PortfolioOverview,
  dashboard: Dashboard,
  operation: OperationPanel,
  history: History,
  settings: Settings,
}

function ScreenFallback() {
  return (
    <section className="card p-6">
      <p className="label">页面加载中</p>
      <p className="body-copy mt-3">正在准备当前页面内容，请稍候。</p>
    </section>
  )
}

function roundToTwo(value) {
  return Number((Number(value) || 0).toFixed(2))
}

function isRebalanceRecord(record) {
  return record?.tag === 'rebalance'
}

function compareRecordsChronologically(left, right) {
  const dateCompare = String(left?.date || '').localeCompare(String(right?.date || ''))
  if (dateCompare !== 0) {
    return dateCompare
  }

  const periodCompare = (Number(left?.periodIndex) || 0) - (Number(right?.periodIndex) || 0)
  if (periodCompare !== 0) {
    return periodCompare
  }

  return String(left?.id || '').localeCompare(String(right?.id || ''))
}

function normalizeRecordAssets(record) {
  const assets = Array.isArray(record?.assets) ? record.assets : []
  const nextAssets = assets.map((asset) => {
    const price = roundToTwo(asset.price)
    const actualShares = Number(asset.actualShares) || 0
    return {
      ...asset,
      price,
      actualShares,
      actualAmount: roundToTwo(actualShares * price),
    }
  })

  return {
    ...record,
    assets: nextAssets,
    totalActualAmount: roundToTwo(nextAssets.reduce((sum, asset) => sum + (Number(asset.actualAmount) || 0), 0)),
  }
}

function getRecordedSharesMap(records, planId) {
  const sharesMap = new Map()
  const safeRecords = Array.isArray(records) ? records : []

  safeRecords
    .filter((record) => record.planId === planId)
    .forEach((record) => {
      const assets = Array.isArray(record.assets) ? record.assets : []

      assets.forEach((asset) => {
        const ticker = asset.ticker
        if (!ticker) return
        sharesMap.set(ticker, roundToTwo((sharesMap.get(ticker) || 0) + (Number(asset.actualShares) || 0)))
      })
    })

  return sharesMap
}

function getInitialSharesMap(plan, sourceRecords) {
  const recordedSharesMap = getRecordedSharesMap(sourceRecords, plan.id)

  return new Map(plan.assets.map((asset) => {
    const currentShares = Number(asset.currentShares) || 0
    const recordedShares = Number(recordedSharesMap.get(asset.ticker)) || 0
    const fallbackInitialShares = Number(asset.initialShares) || 0
    const initialShares = recordedShares > 0
      ? currentShares - recordedShares
      : currentShares || fallbackInitialShares

    return [asset.ticker, roundToTwo(initialShares)]
  }))
}

export function rebuildPlanState(plan, records, sourceRecords = records) {
  if (!plan) {
    return {
      nextPlan: null,
      nextRecords: Array.isArray(records) ? records : [],
    }
  }

  const targetMatrix = calcAllTargets(plan)
  const planRecords = (Array.isArray(records) ? records : [])
    .filter((record) => record.planId === plan.id)
    .slice()
    .sort(compareRecordsChronologically)

  const otherRecords = (Array.isArray(records) ? records : []).filter((record) => record.planId !== plan.id)
  const initialSharesMap = getInitialSharesMap(plan, sourceRecords)
  const assetSharesMap = new Map(plan.assets.map((asset) => [asset.ticker, initialSharesMap.get(asset.ticker) || 0]))
  let cumulativeInvested = 0
  let completedPeriods = 0

  const rebuiltPlanRecords = planRecords.map((record) => {
    const normalizedRecord = normalizeRecordAssets(record)
    const effectivePeriodIndex = completedPeriods
    const nextAssets = normalizedRecord.assets.map((asset) => {
      const planAssetIndex = plan.assets.findIndex((item) => item.ticker === asset.ticker)
      const planAsset = plan.assets[planAssetIndex]
      const previousShares = Number(assetSharesMap.get(asset.ticker)) || 0
      const price = roundToTwo(asset.price)
      const currentValueBefore = roundToTwo(previousShares * price)
      const targetValue = plan.strategy === 'VA'
        ? roundToTwo(Number(targetMatrix?.[effectivePeriodIndex]?.[planAssetIndex] || 0))
        : roundToTwo(getPeriodicAmount(plan, planAsset?.weight))
      const requiredAmount = plan.strategy === 'VA'
        ? getRequiredInvestment(currentValueBefore, targetValue)
        : roundToTwo(getPeriodicAmount(plan, planAsset?.weight))
      const suggestedShares = plan.strategy === 'VA'
        ? getVaSuggestedShares(requiredAmount, price)
        : getDcaSuggestedShares(requiredAmount, price)
      const actualShares = Number(asset.actualShares) || 0
      const actualAmount = roundToTwo(actualShares * price)
      const nextShares = roundToTwo(previousShares + actualShares)

      assetSharesMap.set(asset.ticker, nextShares)

      return {
        ...asset,
        price,
        currentValueBefore,
        targetValue,
        requiredAmount,
        suggestedShares,
        actualShares,
        actualAmount,
      }
    })

    const totalActualAmount = roundToTwo(nextAssets.reduce((sum, asset) => sum + (Number(asset.actualAmount) || 0), 0))
    cumulativeInvested = roundToTwo(cumulativeInvested + totalActualAmount)
    const remainingBudget = getRemainingDeployableBudget(plan, cumulativeInvested)

    if (!isRebalanceRecord(normalizedRecord)) {
      completedPeriods += 1
    }

    return {
      ...normalizedRecord,
      periodIndex: effectivePeriodIndex,
      assets: nextAssets,
      totalActualAmount,
      cumulativeInvested,
      remainingBudget,
    }
  })

  const nextPlan = {
    ...plan,
    currentPeriod: completedPeriods,
    assets: plan.assets.map((asset) => ({
      ...asset,
      initialShares: roundToTwo(initialSharesMap.get(asset.ticker) || 0),
      initialAverageCost: Number(asset.initialAverageCost) || 0,
      currentShares: roundToTwo(assetSharesMap.get(asset.ticker) || 0),
    })),
  }

  const nextRecords = [...otherRecords, ...rebuiltPlanRecords].sort((left, right) => {
    if (left.planId === right.planId) {
      if (left.periodIndex !== right.periodIndex) {
        return right.periodIndex - left.periodIndex
      }

      return String(right.date || '').localeCompare(String(left.date || ''))
    }
    return right.date.localeCompare(left.date)
  })

  return {
    nextPlan,
    nextRecords,
  }
}

export function getImportState(payload) {
  const nextPlans = Array.isArray(payload?.plans)
    ? payload.plans
    : payload?.plan
      ? [payload.plan]
      : []

  return {
    nextPlans,
    nextActivePlanId: payload?.activePlanId || nextPlans[0]?.id || null,
    nextRecords: Array.isArray(payload?.records) ? payload.records : [],
  }
}

export function removePlanData(planId, plans, records, activePlanId) {
  const nextPlans = (Array.isArray(plans) ? plans : []).filter((item) => item.id !== planId)
  const nextRecords = (Array.isArray(records) ? records : []).filter((record) => record.planId !== planId)
  const nextActivePlanId = nextPlans.some((item) => item.id === activePlanId) && activePlanId !== planId
    ? activePlanId
    : nextPlans[0]?.id || null

  return {
    nextPlans,
    nextRecords,
    nextActivePlanId,
  }
}

function rebuildStateAfterRecordDeletion(plan, records, recordId) {
  const remainingRecords = (Array.isArray(records) ? records : []).filter((record) => record.id !== recordId)
  return rebuildPlanState(plan, remainingRecords, records)
}

function rebuildStateAfterRecordEdit(plan, records, updatedRecord) {
  const nextRecords = (Array.isArray(records) ? records : []).map((record) =>
    record.id === updatedRecord.id ? { ...record, ...updatedRecord } : record,
  )
  return rebuildPlanState(plan, nextRecords, records)
}

async function parseApiPayload(response) {
  const text = await response.text()
  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

export default function App() {
  const runtime = getRuntimeInfo()
  const authRequired = Boolean(runtime.authRequired)
  const authenticated = !authRequired || Boolean(runtime.authenticated)
  const { plan, plans, activePlanId, setActivePlan, replacePlan, replacePlans, resetPlan } = usePlan()
  const { records, addRecord, replaceRecords } = useRecords()
  const { theme, themeOptions, preferredDarkTheme, preferredLightTheme, isDarkTheme, setTheme, toggleTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('portfolio')
  const [storageMeta, setStorageMeta] = useState(() => getStorageMeta())
  const [backupPing, setBackupPing] = useState(0)
  const notifiedRecoveryRef = useRef('')

  const Screen = useMemo(() => tabs[activeTab], [activeTab])
  const backupStatus = useMemo(
    () => getBackupStatus(),
    [plan, plans, activePlanId, records, backupPing, storageMeta?.mode],
  )

  const refreshStorageMeta = () => {
    setStorageMeta(getStorageMeta())
  }

  useEffect(() => subscribeStorageMeta(setStorageMeta), [])

  useEffect(() => {
    if (!storageMeta?.recoveredFromBackup) {
      return
    }

    const recoveryToken = `${storageMeta.recoveryFile}|${storageMeta.lastSavedAt}`
    if (notifiedRecoveryRef.current === recoveryToken) {
      return
    }

    notifiedRecoveryRef.current = recoveryToken
    window.alert(`检测到主数据文件损坏，已自动切换到最近备份。\n\n当前数据目录：${storageMeta.storageDir}`)
  }, [storageMeta])

  const handleSavePlan = (nextPlan) => {
    const { nextPlan: rebuiltPlan, nextRecords } = rebuildPlanState(nextPlan, records)
    replaceRecords(nextRecords)
    replacePlan(rebuiltPlan)
    markDataChanged()
    refreshStorageMeta()
    setActiveTab('dashboard')
  }

  const handleSaveRecord = (record, nextPlan) => {
    addRecord(record)
    replacePlan(nextPlan)
    markDataChanged()
    refreshStorageMeta()
    setActiveTab('history')
  }

  const handleDeleteRecord = (recordId) => {
    const { nextPlan, nextRecords } = rebuildStateAfterRecordDeletion(plan, records, recordId)
    replaceRecords(nextRecords)
    replacePlan(nextPlan)
    markDataChanged()
    refreshStorageMeta()
    setActiveTab('history')
  }

  const handleEditRecord = (updatedRecord) => {
    const { nextPlan, nextRecords } = rebuildStateAfterRecordEdit(plan, records, updatedRecord)
    replaceRecords(nextRecords)
    replacePlan(nextPlan)
    markDataChanged()
    refreshStorageMeta()
    setActiveTab('history')
  }

  const handleImportBackup = (payload) => {
    const { nextPlans, nextActivePlanId, nextRecords } = getImportState(payload)

    replaceRecords(nextRecords)
    replacePlans(nextPlans, nextActivePlanId)
    markBackedUp()
    refreshStorageMeta()
    setActiveTab(nextPlans.length ? 'history' : 'settings')
  }

  const handleDeletePlan = (planId) => {
    const { nextPlans, nextRecords, nextActivePlanId } = removePlanData(planId, plans, records, activePlanId)
    replaceRecords(nextRecords)
    replacePlans(nextPlans, nextActivePlanId)
    markDataChanged()
    refreshStorageMeta()
    setActiveTab(nextPlans.length ? 'dashboard' : 'settings')
  }

  const handleClearAllData = () => {
    clearAll()
    replaceRecords([])
    resetPlan()
    refreshStorageMeta()
    setActiveTab('settings')
  }

  const handleExportBackup = () => {
    downloadBackupJson(plan, plans, records, activePlanId)
    setBackupPing((count) => count + 1)
  }

  const handleLogin = async (password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    })
    const payload = await parseApiPayload(response)

    if (!response.ok) {
      throw new Error(payload?.error || '验证失败，请检查密码。')
    }

    window.location.reload()
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
    })
    window.location.reload()
  }

  if (!authenticated) {
    return <AuthScreen onLogin={handleLogin} />
  }

  return (
    <Layout
      activeTab={activeTab}
      onChangeTab={setActiveTab}
      plans={plans}
      activePlanId={activePlanId || ''}
      onChangeActivePlan={setActivePlan}
      theme={theme}
      isDarkTheme={isDarkTheme}
      onToggleTheme={toggleTheme}
      backupStatus={backupStatus}
      onExportBackup={handleExportBackup}
    >
      <Suspense fallback={<ScreenFallback />}>
        <Screen
          plan={plan}
          plans={plans}
          activePlanId={activePlanId}
          storageMeta={storageMeta}
          records={records}
          onChangeActivePlan={setActivePlan}
          onSavePlan={handleSavePlan}
          onSaveRecord={handleSaveRecord}
          onDeleteRecord={handleDeleteRecord}
          onEditRecord={handleEditRecord}
          onImportBackup={handleImportBackup}
          onDeletePlan={handleDeletePlan}
          onClearAllData={handleClearAllData}
          onExportBackup={handleExportBackup}
          authRequired={authRequired}
          onLogout={handleLogout}
          onNavigate={setActiveTab}
          theme={theme}
          themeOptions={themeOptions}
          preferredDarkTheme={preferredDarkTheme}
          preferredLightTheme={preferredLightTheme}
          onSetTheme={setTheme}
        />
      </Suspense>
    </Layout>
  )
}
