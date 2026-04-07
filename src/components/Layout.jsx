import { BarChart3, History as HistoryIcon, Settings as SettingsIcon, WalletCards } from 'lucide-react'

const navItems = [
  { key: 'dashboard', label: '总览', icon: BarChart3 },
  { key: 'operation', label: '本期操作', icon: WalletCards },
  { key: 'history', label: '历史', icon: HistoryIcon },
  { key: 'settings', label: '设置', icon: SettingsIcon },
]

export default function Layout({ activeTab, onChangeTab, children, plans = [], activePlanId = '', onChangeActivePlan }) {
  const hasPlans = Array.isArray(plans) && plans.length > 0

  return (
    <div className="min-h-screen bg-radial px-3 pb-28 pt-4 text-white sm:px-6 sm:pt-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:gap-6">
        <header className="card overflow-hidden p-4 sm:p-5">
          <div className="min-w-0">
            <p className="label">个人定投面板</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">DCA Tracker</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              跟踪每期定投执行、账户累计投入与收益变化，用更清晰的视角管理长期计划。
            </p>
            {hasPlans ? (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="text-sm text-slate-400">当前计划</span>
                <select
                  value={activePlanId}
                  onChange={(event) => onChangeActivePlan?.(event.target.value)}
                  className="rounded-2xl border border-white/10 bg-surface px-4 py-2 text-sm text-white outline-none transition focus:border-accent"
                >
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name || '未命名计划'}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        </header>

        <main className="min-w-0">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-surface/95 backdrop-blur-xl">
        <div className="mx-auto grid max-w-3xl grid-cols-4 gap-1 px-2 py-2 sm:gap-2 sm:px-3 sm:py-3">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = item.key === activeTab
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onChangeTab(item.key)}
                className={`flex min-w-0 flex-col items-center gap-1 rounded-2xl px-2 py-2 transition sm:px-3 ${
                  active ? 'bg-accent text-white shadow-glow' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span className="text-[11px] font-medium sm:text-xs">{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
