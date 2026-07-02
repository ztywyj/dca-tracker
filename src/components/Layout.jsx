import {
  BarChart3,
  History as HistoryIcon,
  Moon,
  PanelsTopLeft,
  Settings as SettingsIcon,
  SunMedium,
  WalletCards,
} from 'lucide-react'

const navItems = [
  { key: 'portfolio', label: '全局', title: 'Portfolio', icon: PanelsTopLeft },
  { key: 'dashboard', label: '总览', title: 'Dashboard', icon: BarChart3 },
  { key: 'operation', label: '本期操作', title: 'Operation', icon: WalletCards },
  { key: 'history', label: '历史', title: 'History', icon: HistoryIcon },
  { key: 'settings', label: '设置', title: 'Settings', icon: SettingsIcon },
]

function PlanSelector({ plans, activePlanId, onChangeActivePlan, compact = false }) {
  const hasPlans = Array.isArray(plans) && plans.length > 0

  if (!hasPlans) {
    return (
      <div className={compact ? 'shell-plan-empty shell-plan-empty-compact' : 'shell-plan-empty'}>
        <span>暂无计划</span>
      </div>
    )
  }

  return (
    <label className={compact ? 'shell-plan shell-plan-compact' : 'shell-plan'}>
      <span>当前计划</span>
      <select
        aria-label="切换当前计划"
        value={activePlanId}
        onChange={(event) => onChangeActivePlan?.(event.target.value)}
      >
        {plans.map((plan) => (
          <option key={plan.id} value={plan.id}>
            {plan.name || '未命名计划'}
          </option>
        ))}
      </select>
    </label>
  )
}

function ThemeButton({ theme, onToggleTheme, compact = false }) {
  const isDark = theme === 'dark'
  const Icon = isDark ? Moon : SunMedium
  const nextThemeLabel = isDark ? '切换到日间主题' : '切换到夜间主题'

  return (
    <button
      type="button"
      aria-label={nextThemeLabel}
      title={nextThemeLabel}
      onClick={onToggleTheme}
      className={compact ? 'theme-toggle theme-toggle-compact' : 'theme-toggle'}
    >
      <Icon size={17} aria-hidden="true" />
      <span>{isDark ? '夜间' : '日间'}</span>
    </button>
  )
}

function NavButton({ item, active, onChangeTab, mobile = false }) {
  const Icon = item.icon

  return (
    <button
      type="button"
      onClick={() => onChangeTab(item.key)}
      aria-current={active ? 'page' : undefined}
      className={
        mobile
          ? `mobile-nav-button ${active ? 'mobile-nav-button-active' : ''}`
          : `sidebar-nav-button ${active ? 'sidebar-nav-button-active' : ''}`
      }
    >
      <Icon size={mobile ? 18 : 17} aria-hidden="true" />
      <span>{item.label}</span>
    </button>
  )
}

export default function Layout({
  activeTab,
  onChangeTab,
  children,
  plans = [],
  activePlanId = '',
  onChangeActivePlan,
  theme = 'dark',
  onToggleTheme,
}) {
  const activeItem = navItems.find((item) => item.key === activeTab) || navItems[0]

  return (
    <div id="root-layout" className="app-shell bg-radial text-white" data-theme={theme}>
      <aside className="desktop-sidebar" aria-label="主导航">
        <div className="sidebar-brand">
          <div className="brand-mark">DC</div>
          <div className="min-w-0">
            <p>Personal Console</p>
            <h1>个人定投面板</h1>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="页面">
          {navItems.map((item) => (
            <NavButton
              key={item.key}
              item={item}
              active={item.key === activeTab}
              onChangeTab={onChangeTab}
            />
          ))}
        </nav>

        <div className="sidebar-footer">
          <PlanSelector
            plans={plans}
            activePlanId={activePlanId}
            onChangeActivePlan={onChangeActivePlan}
          />
          <ThemeButton theme={theme} onToggleTheme={onToggleTheme} />
        </div>
      </aside>

      <div className="mobile-topbar">
        <div className="min-w-0">
          <p className="mobile-page-kicker">{activeItem.title}</p>
          <h1 className="mobile-page-title">{activeItem.label}</h1>
        </div>
        <div className="mobile-topbar-actions">
          <PlanSelector
            plans={plans}
            activePlanId={activePlanId}
            onChangeActivePlan={onChangeActivePlan}
            compact
          />
          <ThemeButton theme={theme} onToggleTheme={onToggleTheme} compact />
        </div>
      </div>

      <div className="app-scroll-area">
        <main className="app-content">{children}</main>
      </div>

      <nav className="mobile-tabbar" aria-label="底部导航">
        <div className="mobile-tabbar-grid">
          {navItems.map((item) => (
            <NavButton
              key={item.key}
              item={item}
              active={item.key === activeTab}
              onChangeTab={onChangeTab}
              mobile
            />
          ))}
        </div>
      </nav>
    </div>
  )
}
