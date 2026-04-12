import { Suspense, lazy, useMemo, useState } from 'react'
import Layout from './components/Layout'
import { getPeriodicAmount, getSuggestedShares as getDcaSuggestedShares } from './utils/dcaCalc'
import { calcAllTargets, getRequiredInvestment, getSuggestedShares as getVaSuggestedShares } from './utils/vaCalc'
import { usePlan } from './hooks/usePlan'
import { useRecords } from './hooks/useRecords'
import { clearAll } from './utils/storage'

const Dashboard = lazy(() => import('./components/Dashboard'))
const History = lazy(() => import('./components/History'))
const OperationPanel = lazy(() => import('./components/OperationPanel'))
const Settings = lazy(() => import('./components/Settings'))

const tabs = {
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

function rebuildPlanState(plan, records) {
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
    .sort((left, right) => left.periodIndex - right.periodIndex)

  const otherRecords = (Array.isArray(records) ? records : []).filter((record) => record.planId !== plan.id)
  const assetSharesMap = new Map(plan.assets.map((asset) => [asset.ticker, 0]))
  let cumulativeInvested = 0

  const rebuiltPlanRecords = planRecords.map((record, index) => {
    const normalizedRecord = normalizeRecordAssets(record)
    const nextAssets = normalizedRecord.assets.map((asset) => {
      const planAssetIndex = plan.assets.findIndex((item) => item.ticker === asset.ticker)
      const planAsset = plan.assets[planAssetIndex]
      const previousShares = Number(assetSharesMap.get(asset.ticker)) || 0
      const price = roundToTwo(asset.price)
      const currentValueBefore = roundToTwo(previousShares * price)
      const targetValue = plan.strategy === 'VA'
        ? roundToTwo(Number(targetMatrix?.[index]?.[planAssetIndex] || 0))
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
    const remainingBudget = plan.budgetMode === 'open-ended'
      ? 0
      : roundToTwo((Number(plan.totalBudget) || 0) - cumulativeInvested)

    return {
      ...normalizedRecord,
      periodIndex: index,
      assets: nextAssets,
      totalActualAmount,
      cumulativeInvested,
      remainingBudget,
    }
  })

  const nextPlan = {
    ...plan,
    currentPeriod: rebuiltPlanRecords.length,
    assets: plan.assets.map((asset) => ({
      ...asset,
      currentShares: roundToTwo(assetSharesMap.get(asset.ticker) || 0),
    })),
  }

  const nextRecords = [...otherRecords, ...rebuiltPlanRecords].sort((left, right) => {
    if (left.planId === right.planId) {
      return right.periodIndex - left.periodIndex
    }
    return right.date.localeCompare(left.date)
  })

  return {
    nextPlan,
    nextRecords,
  }
}

function rebuildStateAfterRecordDeletion(plan, records, recordId) {
  const remainingRecords = (Array.isArray(records) ? records : []).filter((record) => record.id !== recordId)
  return rebuildPlanState(plan, remainingRecords)
}

function rebuildStateAfterRecordEdit(plan, records, updatedRecord) {
  const nextRecords = (Array.isArray(records) ? records : []).map((record) =>
    record.id === updatedRecord.id ? { ...record, ...updatedRecord } : record,
  )
  return rebuildPlanState(plan, nextRecords)
}

export default function App() {
  const { plan, plans, activePlanId, setActivePlan, replacePlan, resetPlan } = usePlan()
  const { records, addRecord, replaceRecords } = useRecords()
  const [activeTab, setActiveTab] = useState('dashboard')

  const Screen = useMemo(() => tabs[activeTab], [activeTab])

  const handleSavePlan = (nextPlan) => {
    replacePlan(nextPlan)
    setActiveTab('dashboard')
  }

  const handleSaveRecord = (record, nextPlan) => {
    addRecord(record)
    replacePlan(nextPlan)
    setActiveTab('history')
  }

  const handleDeleteRecord = (recordId) => {
    const { nextPlan, nextRecords } = rebuildStateAfterRecordDeletion(plan, records, recordId)
    replaceRecords(nextRecords)
    replacePlan(nextPlan)
    setActiveTab('history')
  }

  const handleEditRecord = (updatedRecord) => {
    const { nextPlan, nextRecords } = rebuildStateAfterRecordEdit(plan, records, updatedRecord)
    replaceRecords(nextRecords)
    replacePlan(nextPlan)
    setActiveTab('history')
  }

  const handleImportBackup = (payload) => {
    const nextPlans = Array.isArray(payload?.plans)
      ? payload.plans
      : payload?.plan
        ? [payload.plan]
        : []
    const nextActivePlanId = payload?.activePlanId || nextPlans[0]?.id || null
    const nextRecords = Array.isArray(payload?.records) ? payload.records : []

    replaceRecords(nextRecords)
    nextPlans.forEach((item) => replacePlan(item))
    if (nextActivePlanId) {
      setActivePlan(nextActivePlanId)
    }
    setActiveTab(nextPlans.length ? 'history' : 'settings')
  }

  const handleClearAllData = () => {
    clearAll()
    replaceRecords([])
    resetPlan()
    setActiveTab('settings')
  }

  return (
    <Layout
      activeTab={activeTab}
      onChangeTab={setActiveTab}
      plans={plans}
      activePlanId={activePlanId || ''}
      onChangeActivePlan={setActivePlan}
    >
      <Suspense fallback={<ScreenFallback />}>
        <Screen
          plan={plan}
          plans={plans}
          records={records}
          onSavePlan={handleSavePlan}
          onSaveRecord={handleSaveRecord}
          onDeleteRecord={handleDeleteRecord}
          onEditRecord={handleEditRecord}
          onImportBackup={handleImportBackup}
          onClearAllData={handleClearAllData}
          onNavigate={setActiveTab}
        />
      </Suspense>
    </Layout>
  )
}
