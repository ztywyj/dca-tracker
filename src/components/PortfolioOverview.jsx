import { CalendarClock, Layers3, WalletCards } from 'lucide-react'
import { getPortfolioSnapshot } from '../utils/portfolioSummary'

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function formatSignedMoney(value) {
  const numeric = Number(value) || 0
  const formatted = formatMoney(Math.abs(numeric))
  return `${numeric >= 0 ? '+' : '-'}${formatted}`
}

function getStrategyLabel(value) {
  return value === 'VA' ? 'VA 定投' : 'DCA 定投'
}

function getFrequencyLabel(value) {
  return value === 'biweekly' ? '双周' : '每月'
}

function getTagLabel(tag) {
  if (tag === 'normal') return '正常执行'
  if (tag === 'underweight') return '主动低配'
  if (tag === 'rebalance') return '再平衡'
  if (tag === 'paused') return '本期暂停'
  return tag || '暂无记录'
}

function getStateBadgeClass(value) {
  if (value === 'overdue') return 'badge-warning'
  if (value === 'today') return 'badge-info'
  return 'badge-neutral'
}

function getStateLabel(value) {
  if (value === 'overdue') return '已到期'
  if (value === 'today') return '今天'
  return '未到期'
}

export default function PortfolioOverview({
  plans = [],
  records = [],
  activePlanId,
  onChangeActivePlan,
  onNavigate,
}) {
  const snapshot = getPortfolioSnapshot(plans, records)

  if (!snapshot.planCount) {
    return (
      <section className="card p-8 text-center">
        <p className="label">Portfolio View</p>
        <h2 className="mt-3 text-[1.45rem] font-semibold tracking-[-0.03em] text-white">还没有任何计划</h2>
        <p className="body-copy mt-3">先创建至少一份计划，全局页才会开始汇总所有计划的执行状态、投入和建议时间。</p>
        <button
          type="button"
          onClick={() => onNavigate?.('settings')}
          className="control-button-primary mt-6"
        >
          去创建第一份计划
        </button>
      </section>
    )
  }

  const totalFloatingProfitPct = snapshot.totalInvested > 0
    ? (snapshot.totalFloatingProfit / snapshot.totalInvested) * 100
    : 0

  return (
    <section className="space-y-5">
      <header className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="label">Portfolio View</p>
            <h2 className="mt-3 text-[1.55rem] font-semibold tracking-[-0.035em] text-white">全局总览</h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="badge-neutral">{snapshot.planCount} 份计划</span>
            <span className="badge-neutral">{snapshot.totalRecords} 条历史记录</span>
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="surface-stat">
            <p className="mini-kicker">累计总投入</p>
            <p className="mt-3 data-value text-xl">{formatMoney(snapshot.totalInvested)}</p>
            <p className="mt-2 text-xs text-muted-foreground">所有计划最新累计投入之和。</p>
          </div>
          <div className="surface-stat">
            <p className="mini-kicker">当前总市值</p>
            <p className="mt-3 data-value text-xl">{formatMoney(snapshot.totalMarketValue)}</p>
            <p className="mt-2 text-xs text-muted-foreground">按各计划最新记录价格估算。</p>
          </div>
          <div className="surface-stat">
            <p className="mini-kicker">总浮动盈亏</p>
            <p className={`mt-3 data-value text-xl ${snapshot.totalFloatingProfit >= 0 ? 'text-positive' : 'text-negative'}`}>
              {formatSignedMoney(snapshot.totalFloatingProfit)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              占总投入 {totalFloatingProfitPct >= 0 ? '+' : ''}{totalFloatingProfitPct.toFixed(2)}%。
            </p>
          </div>
          <div className="surface-stat">
            <p className="mini-kicker">待执行计划</p>
            <p className="mt-3 data-value text-xl">{snapshot.duePlanCount}</p>
            <p className="mt-2 text-xs text-muted-foreground">今天或已经到建议定投日的计划数量。</p>
          </div>
          <div className="surface-stat">
            <p className="mini-kicker">最近建议日期</p>
            <p className="mt-3 data-value text-xl">{snapshot.nearestSuggestedDate || '--'}</p>
            <p className="mt-2 text-xs text-muted-foreground">包含 {snapshot.openEndedPlanCount} 份长期执行计划。</p>
          </div>
        </div>
      </header>

      <div className="grid gap-5">
        {snapshot.planSnapshots.map((item) => (
          <article key={item.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[1.18rem] font-semibold tracking-[-0.02em] text-white">{item.name}</h3>
                  {item.id === activePlanId ? <span className="badge-info">当前计划</span> : null}
                  <span className={getStateBadgeClass(item.nextSuggestedState)}>{getStateLabel(item.nextSuggestedState)}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {getStrategyLabel(item.strategy)} · {getFrequencyLabel(item.frequency)} · {item.isOpenEnded ? '无限定投' : '固定预算'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onChangeActivePlan?.(item.id)
                    onNavigate?.('dashboard')
                  }}
                  className="control-button"
                >
                  <Layers3 size={16} />
                  查看计划
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChangeActivePlan?.(item.id)
                    onNavigate?.('operation')
                  }}
                  className="control-button-primary"
                >
                  <WalletCards size={16} />
                  去本期操作
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="surface-stat">
                <p className="mini-kicker">最近记录</p>
                <p className="mt-3 data-value text-lg">{item.latestRecordDate || '--'}</p>
                <p className="mt-2 text-xs text-muted-foreground">{getTagLabel(item.latestTag)}</p>
              </div>
              <div className="surface-stat">
                <p className="mini-kicker">建议下次定投</p>
                <p className="mt-3 data-value text-lg">{item.nextSuggestedDate || '--'}</p>
                <p className="mt-2 text-xs text-muted-foreground">已执行 {item.recordCount} 期 · {item.assetCount} 个标的</p>
              </div>
              <div className="surface-stat">
                <p className="mini-kicker">累计投入 / 市值</p>
                <p className="mt-3 data-value text-lg">{formatMoney(item.totalInvested)}</p>
                <p className="mt-2 text-xs text-muted-foreground">当前市值 {formatMoney(item.marketValue)}</p>
              </div>
              <div className="surface-stat">
                <p className="mini-kicker">浮动盈亏</p>
                <p className={`mt-3 data-value text-lg ${item.floatingProfit >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {formatSignedMoney(item.floatingProfit)}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {item.isOpenEnded ? '长期执行中' : `剩余可投 ${formatMoney(item.remainingBudget)}`}
                </p>
              </div>
            </div>

            <div className="mt-4 subtle-panel px-4 py-3 text-sm text-muted-foreground">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2">
                  <CalendarClock size={15} />
                  {item.hasRecords ? '建议定投日基于最近一次记录自动顺延。' : '这份计划还没有历史记录，建议从今天开始。'}
                </span>
                <span className="data-subtle">
                  {item.currentPeriod > 0 ? `当前已推进到第 ${item.currentPeriod + 1} 期` : '尚未开始执行'}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
