import { useState } from 'react'
import { CalendarDays, Layers3 } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getDeployableBudget, getRemainingDeployableBudget } from '../utils/budget'
import { getNextSuggestedOperationDate } from '../utils/schedule'
import { calculateAverageCost, calculatePriceGapPct } from '../utils/portfolioCost'

const PIE_COLORS = ['#8ea9ff', '#51d0bf', '#f2b36f', '#c98bff', '#ff8f9d', '#7e90ff']

const chartTickStyle = {
  fill: '#8893a6',
  fontFamily: '"IBM Plex Mono", monospace',
  fontSize: 12,
}

const chartTooltipStyle = {
  background: 'rgba(15, 17, 23, 0.98)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '1rem',
  color: '#eef3f9',
  boxShadow: '0 18px 36px rgba(3, 6, 14, 0.34)',
  fontFamily: '"IBM Plex Mono", monospace',
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function formatMoneyPrecise(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

function formatCompactMoney(value) {
  const numeric = Number(value) || 0
  if (Math.abs(numeric) >= 1000) {
    return `$${(numeric / 1000).toFixed(Math.abs(numeric) >= 10000 ? 0 : 1)}k`
  }
  return `$${Math.round(numeric)}`
}

function formatPercent(value) {
  if (value === null || value === undefined || value === '') {
    return '--'
  }

  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return '--'
  }
  return `${numeric >= 0 ? '+' : ''}${numeric.toFixed(2)}%`
}

function formatOptionalMoney(value) {
  if (value === null || value === undefined || value === '') {
    return '--'
  }

  return Number.isFinite(Number(value)) ? formatMoneyPrecise(value) : '--'
}

function formatMultiple(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return '--'
  }
  return `${numeric.toFixed(2)}x`
}

function formatSignedMoney(value) {
  const numeric = Number(value) || 0
  const formatted = formatMoney(Math.abs(numeric))
  return `${numeric >= 0 ? '+' : '-'}${formatted}`
}

function getProfitLabel(value) {
  return (Number(value) || 0) >= 0 ? '盈利' : '亏损'
}

function getTagLabel(tag) {
  if (tag === 'normal') return '正常执行'
  if (tag === 'underweight') return '主动低配'
  if (tag === 'rebalance') return '再平衡'
  if (tag === 'paused') return '本期暂停'
  return tag || '未标记'
}

function getTagBadgeClass(tag) {
  if (tag === 'normal') return 'badge-info'
  if (tag === 'underweight') return 'badge-warning'
  if (tag === 'rebalance') return 'badge-positive'
  if (tag === 'paused') return 'badge-neutral'
  return 'badge-neutral'
}

function getRecordStageLabel(record) {
  return record?.tag === 'rebalance'
    ? `R${Number(record.periodIndex) + 1}`
    : `P${Number(record?.periodIndex) + 1}`
}

function getProgressToneClass(ratio) {
  if (ratio < 0.55) return 'bg-accent'
  if (ratio < 0.85) return 'bg-warning'
  return 'bg-negative'
}

function getGapToneClass(value) {
  if (value >= 0.75) return 'text-accent'
  if (value <= -0.75) return 'text-warning'
  return 'text-textSoft'
}

function MetaTile({ label, value, detail, mono = false }) {
  return (
    <div className="subtle-panel flex h-full flex-col justify-between p-4">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={`mt-3 text-sm font-medium text-white ${mono ? 'data-value' : 'font-sans'}`}>{value}</p>
      {detail ? <p className="mt-2 text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  )
}

function MetricCard({ label, value, meta, tone = 'text-white', mono = true }) {
  return (
    <article className="subtle-panel dashboard-metric-card p-5">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p className={`mt-4 text-[1.65rem] font-semibold tracking-[-0.03em] ${mono ? 'data-value' : 'font-sans'} ${tone}`}>{value}</p>
      </div>
      <div className="mt-3 text-sm leading-6 text-muted-foreground">{meta}</div>
    </article>
  )
}

function LegendPill({ color, label }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  )
}

function ActiveWeightShape(props) {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
  } = props

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 3}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.34}
      />
    </g>
  )
}

export default function Dashboard({ plan, records, onNavigate }) {
  const [activeWeightIndex, setActiveWeightIndex] = useState(0)

  if (!plan) {
    return (
      <section className="card p-6 text-center text-textSoft">
        还没有计划，先去设置页创建你的第一份定投计划吧。
      </section>
    )
  }

  const isOpenEnded = plan.budgetMode === 'open-ended'
  const planRecords = records
    .filter((record) => record.planId === plan.id)
    .slice()
    .sort((left, right) => {
      if (left.periodIndex !== right.periodIndex) {
        return left.periodIndex - right.periodIndex
      }

      return String(left.date || '').localeCompare(String(right.date || ''))
    })

  if (!planRecords.length) {
    return (
      <section className="card p-8 text-center">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 text-left">
            <p className="label">Overview</p>
            <h2 className="mt-3 text-[1.45rem] font-semibold tracking-[-0.03em] text-white">还没有操作记录</h2>
            <p className="body-copy mt-3 max-w-2xl">
              创建好计划后，前往“本期操作”录入第一期价格与买入股数，总览页会自动生成趋势、仓位和预算检查。
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('operation')}
          className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.05] px-5 py-3 text-sm font-medium text-white transition hover:border-white/[0.12] hover:bg-white/[0.07]"
        >
          去完成第一期定投
        </button>
      </section>
    )
  }

  const latestRecord = planRecords[planRecords.length - 1]
  const latestDate = latestRecord.date.slice(0, 10)
  const nextSuggestedDate = getNextSuggestedOperationDate(plan, records)
  const strategyLabel = plan.strategy === 'VA' ? 'VA 定投' : 'DCA 定投'
  const frequencyLabel = plan.frequency === 'biweekly' ? '双周' : '每月'
  const latestTagLabel = getTagLabel(latestRecord.tag)
  const latestPriceMap = Object.fromEntries(latestRecord.assets.map((asset) => [asset.ticker, Number(asset.price) || 0]))
  const marketValue = plan.assets.reduce(
    (sum, asset) => sum + (Number(asset.currentShares) || 0) * (latestPriceMap[asset.ticker] || 0),
    0,
  )
  const totalInvested = Number(latestRecord.cumulativeInvested) || 0
  const floatingProfit = marketValue - totalInvested
  const floatingProfitPct = totalInvested > 0 ? (floatingProfit / totalInvested) * 100 : 0
  const totalBudget = Number(plan.totalBudget) || 0
  const deployableBudget = getDeployableBudget(plan)
  const remainingBudget = Math.max(0, getRemainingDeployableBudget(plan, totalInvested))
  const reserveFloor = Math.max(0, totalBudget - deployableBudget)
  const progressRatio = deployableBudget > 0 ? Math.min(totalInvested / deployableBudget, 1) : 0
  const drawableBudget = remainingBudget

  const performanceData = planRecords.map((record) => {
    const marketValueAtClose = record.assets.reduce(
      (sum, asset) => sum + (Number(asset.currentValueBefore) || 0) + (Number(asset.actualAmount) || 0),
      0,
    )
    const cumulativeInvested = Number(record.cumulativeInvested) || 0
    const periodAmount = Number(record.totalActualAmount) || 0
    const netResult = marketValueAtClose - cumulativeInvested

    return {
      label: getRecordStageLabel(record),
      marketValue: marketValueAtClose,
      cumulativeInvested,
      periodAmount,
      netResult,
    }
  })

  const fundingData = planRecords.map((record) => ({
    label: getRecordStageLabel(record),
    amount: Number(record.totalActualAmount) || 0,
    cumulative: Number(record.cumulativeInvested) || 0,
  }))

  const averageCostMap = new Map(
    plan.assets.map((asset) => [asset.ticker, calculateAverageCost(asset, planRecords)]),
  )

  const currentWeightData = plan.assets.map((asset, index) => {
    const price = latestPriceMap[asset.ticker] || 0
    const value = (Number(asset.currentShares) || 0) * price
    const averageCostInfo = averageCostMap.get(asset.ticker) || { shares: 0, averageCost: null, hasKnownCost: false }
    const priceGapPct = calculatePriceGapPct(price, averageCostInfo.averageCost)
    const actualWeight = marketValue > 0 ? Number(((value / marketValue) * 100).toFixed(2)) : 0
    const targetWeight = Number(((Number(asset.weight) || 0) * 100).toFixed(2))

    return {
      name: asset.ticker,
      actualWeight,
      targetWeight,
      value,
      shares: Number(asset.currentShares) || 0,
      latestPrice: price,
      averageCost: averageCostInfo.averageCost,
      hasKnownAverageCost: averageCostInfo.hasKnownCost,
      weightGap: Number((actualWeight - targetWeight).toFixed(2)),
      priceGapPct,
      color: PIE_COLORS[index % PIE_COLORS.length],
    }
  })

  const safeActiveWeightIndex = Math.min(activeWeightIndex, Math.max(currentWeightData.length - 1, 0))
  const activeWeight = currentWeightData[safeActiveWeightIndex]
  const latestPerformancePoint = performanceData[performanceData.length - 1] || {
    label: latestDate,
    marketValue,
    cumulativeInvested: totalInvested,
    periodAmount: Number(latestRecord.totalActualAmount) || 0,
    netResult: floatingProfit,
  }
  const strongestPerformancePoint = performanceData.reduce(
    (best, point) => (point.netResult > best.netResult ? point : best),
    performanceData[0] || latestPerformancePoint,
  )
  const averagePeriodAmount = performanceData.length
    ? performanceData.reduce((sum, point) => sum + point.periodAmount, 0) / performanceData.length
    : 0
  const capitalMultiple = latestPerformancePoint.cumulativeInvested > 0
    ? latestPerformancePoint.marketValue / latestPerformancePoint.cumulativeInvested
    : 0

  const summaryMeta = [
    {
      label: '策略',
      value: strategyLabel,
      detail: isOpenEnded ? '长期目标模式' : '预算内执行',
    },
    {
      label: '频率',
      value: frequencyLabel,
      detail: `已执行 ${planRecords.length} 期`,
    },
    {
      label: '最近记录',
      value: latestDate,
      detail: latestTagLabel,
      mono: true,
    },
    {
      label: '建议下次定投',
      value: nextSuggestedDate || '--',
      detail: plan.frequency === 'biweekly' ? '按双周频率顺延' : '按月度频率顺延',
      mono: true,
    },
    {
      label: '计划状态',
      value: isOpenEnded ? '持续投入中' : `剩余 ${Math.max((Number(plan.totalPeriods) || 0) - plan.currentPeriod, 0)} 期`,
      detail: isOpenEnded ? '无固定终点' : '按预算推进',
    },
  ]

  const metrics = [
    {
      label: '当前总市值',
      value: formatMoney(marketValue),
      meta: <>覆盖 <span className="data-subtle">{plan.assets.length}</span> 个标的，按最新价格估值。</>,
      tone: 'text-white',
    },
    {
      label: '累计总投入',
      value: formatMoney(totalInvested),
      meta: <>累计写入 <span className="data-subtle">{planRecords.length}</span> 条执行记录。</>,
      tone: 'text-white',
    },
    {
      label: '浮动盈亏',
      value: formatSignedMoney(floatingProfit),
      meta: <>{getProfitLabel(floatingProfit)} <span className="data-subtle">{formatPercent(floatingProfitPct)}</span>，当前仓位对累计投入的偏离。</>,
      tone: floatingProfit >= 0 ? 'text-positive' : 'text-negative',
    },
    {
      label: isOpenEnded ? '本期状态' : '剩余可投',
      value: isOpenEnded ? latestTagLabel : formatMoney(remainingBudget),
      meta: isOpenEnded
        ? <>最新记录日期 <span className="data-subtle">{latestDate}</span>。</>
        : <>保留底仓 <span className="data-subtle">{formatMoney(reserveFloor)}</span>，仍可动用 <span className="data-subtle">{formatMoney(drawableBudget)}</span>。</>,
      tone: 'text-white',
      mono: !isOpenEnded,
    },
  ]

  return (
    <section className="space-y-5">
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
        <div className="space-y-4">
          <header className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="label">Overview</p>
                <h2 className="mt-3 text-[1.55rem] font-semibold tracking-[-0.035em] text-white">{plan.name || '当前计划'}</h2>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {summaryMeta.map((item) => (
                <MetaTile
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  detail={item.detail}
                  mono={item.mono}
                />
              ))}
            </div>
          </header>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <MetricCard
                key={metric.label}
                label={metric.label}
                value={metric.value}
                meta={metric.meta}
                tone={metric.tone}
              />
            ))}
          </div>
        </div>

        <aside className="card p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="label">Execution Health</p>
              <h3 className="mt-3 text-[1.05rem] font-semibold tracking-[-0.02em] text-white">计划健康度</h3>
            </div>
            <span className={getTagBadgeClass(latestRecord.tag)}>{latestTagLabel}</span>
          </div>

          <div className="mt-5 space-y-4">
            {!isOpenEnded ? (
              <div className="subtle-panel p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground">预算推进</p>
                  <span className="data-subtle text-sm">{Math.round(progressRatio * 100)}%</span>
                </div>
                <div className="mt-4 h-2 rounded-full bg-white/[0.05]">
                  <div
                    className={`h-2 rounded-full transition-all ${getProgressToneClass(progressRatio)}`}
                    style={{ width: `${Math.min(progressRatio * 100, 100)}%` }}
                  />
                </div>
                <div className="mt-4 space-y-3">
                  <div className="subtle-row">
                    <span>可投资金</span>
                    <span className="data-subtle">{formatMoney(deployableBudget)}</span>
                  </div>
                  <div className="subtle-row">
                    <span>保留底仓</span>
                    <span className="data-subtle">{formatMoney(reserveFloor)}</span>
                  </div>
                  <div className="subtle-row">
                    <span>剩余可投</span>
                    <span className="data-subtle">{formatMoney(drawableBudget)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="subtle-panel p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground">长期执行</p>
                  <span className="data-subtle text-sm">Open-ended</span>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="subtle-row">
                    <span>累计期数</span>
                    <span className="data-subtle">{planRecords.length}</span>
                  </div>
                  <div className="subtle-row">
                    <span>最新记录</span>
                    <span className="data-subtle">{latestDate}</span>
                  </div>
                  <div className="subtle-row">
                    <span>本期状态</span>
                    <span className="data-subtle">{latestTagLabel}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="subtle-panel p-4">
              <div className="subtle-row">
                <span className="inline-flex items-center gap-2">
                  <CalendarDays size={14} />
                  最新记录
                </span>
                <span className="data-subtle">{latestDate}</span>
              </div>
              <div className="mt-3 subtle-row">
                <span className="inline-flex items-center gap-2">
                  <Layers3 size={14} />
                  标的数量
                </span>
                <span className="data-subtle">{plan.assets.length}</span>
              </div>
              <div className="mt-4 border-t border-white/[0.06] pt-4">
                <p className="text-sm leading-6 text-muted-foreground">{latestRecord.note || '本期未填写备注，建议在执行页写下这一期的判断。'}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.22fr)_minmax(340px,0.78fr)]">
        <article className="chart-card flex min-h-[32rem] flex-col">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="label">Capital Progress</p>
              <h3 className="mt-3 text-[1.05rem] font-semibold tracking-[-0.02em] text-white">投入与市值</h3>
            </div>
            <div className="flex flex-wrap gap-4">
              <LegendPill color="#7aa2ff" label="组合市值" />
              <LegendPill color="#e9eefb" label="累计投入" />
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="subtle-panel p-4">
              <p className="mini-kicker">当前差额</p>
              <p className={`mt-3 data-value text-xl ${latestPerformancePoint.netResult >= 0 ? 'text-positive' : 'text-negative'}`}>
                {formatSignedMoney(latestPerformancePoint.netResult)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">最新一期组合市值减去累计投入。</p>
            </div>
            <div className="subtle-panel p-4">
              <p className="mini-kicker">市值 / 投入</p>
              <p className="mt-3 data-value text-xl">{formatMultiple(capitalMultiple)}</p>
              <p className="mt-2 text-xs text-muted-foreground">越高说明资金投入后的账面效率越强。</p>
            </div>
            <div className="subtle-panel p-4">
              <p className="mini-kicker">最佳阶段</p>
              <p className={`mt-3 data-value text-xl ${strongestPerformancePoint.netResult >= 0 ? 'text-positive' : 'text-negative'}`}>
                {strongestPerformancePoint.label}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                差额 {formatSignedMoney(strongestPerformancePoint.netResult)}，平均每期投入 {formatMoney(averagePeriodAmount)}。
              </p>
            </div>
          </div>

          <div className="dashboard-trajectory-plot">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={performanceData}
                margin={{ top: 18, right: 12, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="trajectoryGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7aa2ff" stopOpacity={0.26} />
                    <stop offset="100%" stopColor="#7aa2ff" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.045)" />
                <XAxis
                  dataKey="label"
                  tick={chartTickStyle}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  height={34}
                  tickMargin={10}
                />
                <YAxis
                  tick={chartTickStyle}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
                  width={66}
                  tickMargin={10}
                  tickFormatter={(value) => formatCompactMoney(value)}
                />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  labelStyle={{ color: '#eef3f9', fontWeight: 600 }}
                  itemStyle={{ color: '#d7dfeb' }}
                  cursor={{ stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 }}
                  formatter={(value, name, item) => {
                    const label = name === 'marketValue' ? '组合市值' : '累计投入'
                    const delta = Number(item.payload.marketValue || 0) - Number(item.payload.cumulativeInvested || 0)
                    return [formatMoney(value), `${label}${name === 'marketValue' ? ` · 差额 ${formatSignedMoney(delta)}` : ''}`]
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="marketValue"
                  stroke="#7aa2ff"
                  fill="url(#trajectoryGradient)"
                  strokeWidth={2.4}
                  name="marketValue"
                />
                <Line
                  type="monotone"
                  dataKey="cumulativeInvested"
                  stroke="#e9eefb"
                  strokeWidth={1.8}
                  strokeDasharray="5 5"
                  dot={false}
                  name="cumulativeInvested"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="chart-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="label">Allocation</p>
              <h3 className="mt-3 text-[1.05rem] font-semibold tracking-[-0.02em] text-white">仓位结构</h3>
            </div>
            <span className="text-xs text-muted-foreground">Hover / Focus</span>
          </div>

          <div className="mt-5 grid gap-5">
            <div className="relative h-[19rem] subtle-panel p-3">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={chartTooltipStyle}
                    formatter={(value, _name, item) => [`${value}%`, `${item.payload.name} 当前权重`]}
                  />
                  <Pie
                    data={currentWeightData}
                    dataKey="actualWeight"
                    nameKey="name"
                    innerRadius={80}
                    outerRadius={112}
                    paddingAngle={2}
                    activeIndex={safeActiveWeightIndex}
                    activeShape={ActiveWeightShape}
                    onMouseEnter={(_, index) => setActiveWeightIndex(index)}
                  >
                    {currentWeightData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              {activeWeight ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <p className="label">当前聚焦</p>
                    <p className="mt-3 font-sans text-[1.35rem] font-semibold text-white">{activeWeight.name}</p>
                    <p className="mt-2 data-subtle text-sm">{activeWeight.actualWeight}%</p>
                    <p className="mt-2 data-subtle text-sm">{formatMoney(activeWeight.value)}</p>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="grid gap-2.5">
              {currentWeightData.map((asset, index) => (
                <button
                  key={asset.name}
                  type="button"
                  onMouseEnter={() => setActiveWeightIndex(index)}
                  onFocus={() => setActiveWeightIndex(index)}
                  className={`subtle-panel px-4 py-3 text-left transition ${
                    index === safeActiveWeightIndex
                      ? 'border-white/[0.12] bg-white/[0.05]'
                      : 'hover:border-white/[0.10] hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: asset.color }} />
                      <span className="font-sans text-sm font-medium text-white">{asset.name}</span>
                    </div>
                    <span className="data-subtle text-sm">{asset.actualWeight}%</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-4 text-xs text-muted-foreground">
                    <span>目标 {asset.targetWeight}%</span>
                    <span className={`data-subtle ${getGapToneClass(asset.weightGap)}`}>
                      {asset.weightGap >= 0 ? '+' : ''}{asset.weightGap}%
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </article>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
        <article className="chart-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="label">Funding Rhythm</p>
              <h3 className="mt-3 text-[1.05rem] font-semibold tracking-[-0.02em] text-white">投入节奏</h3>
            </div>
            <div className="flex flex-wrap gap-4">
              <LegendPill color="#7aa2ff" label="本期投入" />
              <LegendPill color="#f3f7ff" label="累计投入" />
            </div>
          </div>

          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fundingData}>
                <defs>
                  <linearGradient id="fundingAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7aa2ff" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#7aa2ff" stopOpacity={0.015} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.045)" />
                <XAxis dataKey="label" tick={chartTickStyle} tickLine={false} axisLine={false} />
                <YAxis tick={chartTickStyle} tickLine={false} axisLine={false} width={72} />
                <Tooltip
                  contentStyle={chartTooltipStyle}
                  labelStyle={{ color: '#eef3f9', fontWeight: 600 }}
                  itemStyle={{ color: '#d7dfeb' }}
                  formatter={(value, name) => [formatMoney(value), name === 'amount' ? '本期投入' : '累计投入']}
                />
                <Area
                  type="monotone"
                  dataKey="amount"
                  stroke="#7aa2ff"
                  fill="url(#fundingAreaGradient)"
                  strokeWidth={2.15}
                  name="本期投入"
                />
                <Line type="monotone" dataKey="cumulative" stroke="#f3f7ff" strokeWidth={1.8} dot={false} name="累计投入" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="chart-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="label">Checks</p>
              <h3 className="mt-3 text-[1.05rem] font-semibold tracking-[-0.02em] text-white">关键检查点</h3>
            </div>
            <span className="text-xs text-muted-foreground">Avg cost / latest / gap</span>
          </div>

          <div className="mt-5 overflow-hidden rounded-[1rem] border border-white/[0.06]">
            <div className="grid grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)] gap-3 bg-white/[0.03] px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <span>Ticker</span>
              <span>平均成本</span>
              <span>最新价格</span>
              <span className="text-right">权重偏离</span>
            </div>

            <div className="divide-y divide-white/[0.06]">
              {currentWeightData.map((asset) => (
                <div
                  key={asset.name}
                  className="grid grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.8fr)] items-center gap-3 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-sans text-sm font-medium text-white">{asset.name}</p>
                    <p className="mt-1 data-subtle text-xs">{asset.shares} 股</p>
                  </div>
                  <div>
                    <p className="data-subtle text-sm">{formatOptionalMoney(asset.averageCost)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">仓位 <span className="data-subtle">{asset.actualWeight}%</span></p>
                  </div>
                  <div>
                    <p className="data-subtle text-sm">{formatMoneyPrecise(asset.latestPrice)}</p>
                    <p className={`mt-1 text-xs ${asset.priceGapPct === null ? 'text-muted-foreground' : asset.priceGapPct >= 0 ? 'text-positive' : 'text-negative'}`}>
                      {formatPercent(asset.priceGapPct)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`data-subtle text-sm ${getGapToneClass(asset.weightGap)}`}>
                      {asset.weightGap >= 0 ? '+' : ''}{asset.weightGap}%
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">目标 <span className="data-subtle">{asset.targetWeight}%</span></p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>
      </div>
    </section>
  )
}
