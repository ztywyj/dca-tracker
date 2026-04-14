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
    <div id="root-layout" className="app-shell bg-radial text-white">
      <div className="app-scroll-area">
        <header className="topbar-shell sticky top-0 z-40 border-b border-white/[0.06]">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="label">个人定投面板</p>
                <h1 className="mt-2 font-sans text-2xl font-semibold tracking-[-0.03em] text-white sm:text-[1.95rem]">
                  DCA Tracker
                </h1>
              </div>

              {hasPlans ? (
                <div className="flex min-w-0 flex-col gap-2 lg:min-w-[19rem]">
                  <label htmlFor="active-plan-select" className="text-xs uppercase tracking-[0.18em] text-muted">
                    当前计划
                  </label>
                  <select
                    id="active-plan-select"
                    aria-label="切换当前计划"
                    value={activePlanId}
                    onChange={(event) => onChangeActivePlan?.(event.target.value)}
                    className="topbar-select data-value"
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
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <main className="min-w-0">{children}</main>
        </div>
      </div>

      <nav className="tab-bar-shell border-t border-white/[0.06] bg-surface/90 backdrop-blur-xl">
        <div className="mx-auto grid h-[60px] max-w-3xl grid-cols-4 gap-1 px-2 sm:gap-2 sm:px-3">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = item.key === activeTab

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onChangeTab(item.key)}
                className={`flex h-full min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 transition sm:px-3 ${
                  active ? 'border border-accent/18 bg-accent/10 text-slate-100 shadow-none' : 'border border-transparent text-muted hover:border-line/80 hover:bg-elevated/70 hover:text-white'
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
