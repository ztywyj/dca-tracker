import { BarChart3, History as HistoryIcon, PanelsTopLeft, Settings as SettingsIcon, WalletCards } from 'lucide-react'

const navItems = [
  { key: 'portfolio', label: '全局', icon: PanelsTopLeft },
  { key: 'dashboard', label: '总览', icon: BarChart3 },
  { key: 'operation', label: '本期操作', icon: WalletCards },
  { key: 'history', label: '历史', icon: HistoryIcon },
  { key: 'settings', label: '设置', icon: SettingsIcon },
]

export default function Layout({
  activeTab,
  onChangeTab,
  children,
  plans = [],
  activePlanId = '',
  onChangeActivePlan,
}) {
  const hasPlans = Array.isArray(plans) && plans.length > 0

  return (
    <div id="root-layout" className="app-shell bg-radial text-white">
      <div className="app-scroll-area">
        <header className="topbar-shell sticky top-0 z-40 border-b border-white/[0.06]">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
            <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-sm">
              个人定投面板
            </p>

            {hasPlans ? (
              <div className="flex min-w-0 max-w-[72vw] items-center sm:max-w-[24rem]">
                <select
                  id="active-plan-select"
                  aria-label="切换当前计划"
                  value={activePlanId}
                  onChange={(event) => onChangeActivePlan?.(event.target.value)}
                  className="topbar-select min-w-0 flex-1 px-3 py-2 text-sm sm:px-4 sm:py-3"
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

        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <main className="min-w-0">{children}</main>
        </div>
      </div>

      <nav className="tab-bar-shell border-t border-white/[0.06] bg-surface/90 backdrop-blur-xl">
        <div className="mx-auto grid h-[60px] max-w-4xl grid-cols-5 gap-1 px-2 sm:gap-2 sm:px-3">
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
