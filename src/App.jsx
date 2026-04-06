import { useMemo, useState } from 'react'
import Dashboard from './components/Dashboard'
import History from './components/History'
import Layout from './components/Layout'
import OperationPanel from './components/OperationPanel'
import Settings from './components/Settings'
import { usePlan } from './hooks/usePlan'
import { useRecords } from './hooks/useRecords'

const tabs = {
  dashboard: Dashboard,
  operation: OperationPanel,
  history: History,
  settings: Settings,
}

export default function App() {
  const { plan, replacePlan } = usePlan()
  const { records, addRecord } = useRecords()
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

  if (!plan) {
    return (
      <Layout activeTab="settings" onChangeTab={setActiveTab}>
        <Settings
          plan={null}
          records={records}
          onSavePlan={handleSavePlan}
          onSaveRecord={handleSaveRecord}
          onNavigate={setActiveTab}
        />
      </Layout>
    )
  }

  return (
    <Layout activeTab={activeTab} onChangeTab={setActiveTab}>
      <Screen
        plan={plan}
        records={records}
        onSavePlan={handleSavePlan}
        onSaveRecord={handleSaveRecord}
        onNavigate={setActiveTab}
      />
    </Layout>
  )
}
