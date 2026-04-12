import { useMemo, useState } from 'react'
import { Activity, Banknote, CircleDollarSign, HelpCircle, ShieldEllipsis } from 'lucide-react'
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { calcAllTargets } from '../utils/vaCalc'

const PIE_COLORS = ['#60a5fa', '#38bdf8', '#22c55e', '#f59e0b', '#94a3b8', '#ef4444']

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

function formatPercent(value) {
  const numeric = Number(value) || 0
  return `${numeric >= 0 ? '+' : ''}${numeric.toFixed(2)}%`
}

function formatSignedMoney(value) {
  const numeric = Number(value) || 0
  const formatted = formatMoney(Math.abs(numeric))
  return `${numeric >= 0 ? '+' : '-'}${formatted}`
}

function getProfitA11yLabel(value) {
  const numeric = Number(value) || 0
  return numeric >= 0 ? '盈利' : '亏损'
}

function getProgressTone(ratio) {
  if (ratio < 0.55) return 'bg-accent'
  if (ratio < 0.85) return 'bg-amber-400'
  return 'bg-negative'
}

function getTagLabel(tag) {
  if (tag === 'normal') return '正常执行'
  if (tag === 'underweight') return '主动低配'
  if (tag === 'paused') return '本期暂停'
  return tag || '未标记'
}

function getTagColor(tag) {
  if (tag === 'normal') return '#60a5fa'
  if (tag === 'underweight') return '#f59e0b'
  if (tag === 'paused') return '#64748b'
  return '#60a5fa'
}

function GuideBadge({ children }) {
  return (
    <div className="mt-3 rounded-2xl border border-line/80 bg-elevated/55 px-3 py-2 text-xs leading-5 text-textSoft">
      {children}
    </div>
  )
}

export default function Dashboard({ plan, records, onNavigate }) {
  const [showGuide, setShowGuide] = useState(false)

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
    .sort((left, right) => left.periodIndex - right.periodIndex)

  if (!planRecords.length) {
    return (
      <section className="card p-8 text-center">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="label">暂无执行记录</p>
            <h2 className="heading-section mt-3">还没有操作记录，去完成第一期定投吧</h2>
            <p className="body-copy mt-3">创建好计划后，前往“本期操作”录入第一期价格与买入股数。</p>
          </div>
          <button
            type="button"
            onClick={() => setShowGuide((current) => !current)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line/80 bg-elevated/70 text-textSoft transition hover:border-accent/20 hover:bg-elevated"
            aria-label="切换总览说明"
          >
            <HelpCircle size={16} />
          </button>
        </div>
        {showGuide ? <GuideBadge>总览页会在你产生第一条记录后，展示关键指标、资金进度和图表解释。</GuideBadge> : null}
        <button
          type="button"
          onClick={() => onNavigate('operation')}
          className="mt-6 rounded-2xl border border-accent/20 bg-accent/12 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-accent/28 hover:bg-accent/16"
        >
          去完成第一期定投
        </button>
      </section>
    )
  }

  const latestRecord = planRecords[planRecords.length - 1]
  const latestPriceMap = Object.fromEntries(latestRecord.assets.map((asset) => [asset.ticker, Number(asset.price) || 0]))
  const marketValue = plan.assets.reduce(
    (sum, asset) => sum + (Number(asset.currentShares) || 0) * (latestPriceMap[asset.ticker] || 0),
    0,
  )
  const totalInvested = Number(latestRecord.cumulativeInvested) || 0
  const remainingBudget = Number(latestRecord.remainingBudget) || 0
  const floatingProfit = marketValue - totalInvested
  const floatingProfitPct = totalInvested > 0 ? (floatingProfit / totalInvested) * 100 : 0
  const deployableBudget = (Number(plan.totalBudget) || 0) * (1 - (Number(plan.reserveRatio) || 0))
  const reserveFloor = (Number(plan.totalBudget) || 0) * (Number(plan.reserveRatio) || 0)
  const progressRatio = deployableBudget > 0 ? Math.min(totalInvested / deployableBudget, 1) : 0
  const drawableBudget = Math.max(0, deployableBudget - totalInvested)
  const targetMatrix = calcAllTargets(plan)

  const valueCurveData = planRecords.map((record) => {
    const periodTargetValues = targetMatrix[record.periodIndex] || []
    const targetValue = periodTargetValues.reduce((sum, value) => sum + (Number(value) || 0), 0)
    const actualValue = record.assets.reduce(
      (sum, asset) => sum + (Number(asset.actualShares) || 0) * (Number(asset.price) || 0),
      0,
    )

    return {
      label: `第${record.periodIndex + 1}期`,
      targetValue,
      actualValue,
    }
  })

  const flowData = planRecords.map((record) => ({
    label: `第${record.periodIndex + 1}期`,
    amount: Number(record.totalActualAmount) || 0,
    tag: record.tag,
    tagLabel: getTagLabel(record.tag),
  }))

  const currentWeightData = plan.assets.map((asset, index) => {
    const price = latestPriceMap[asset.ticker] || 0
    const value = (Number(asset.currentShares) || 0) * price
    return {
      name: asset.ticker,
      actualWeight: marketValue > 0 ? Number(((value / marketValue) * 100).toFixed(2)) : 0,
      targetWeight: Number(((Number(asset.weight) || 0) * 100).toFixed(2)),
      value,
      shares: Number(asset.currentShares) || 0,
      latestPrice: price,
      color: PIE_COLORS[index % PIE_COLORS.length],
    }
  })

  const averageCostData = plan.assets
    .map((asset) => {
      const totalShares = Number(asset.currentShares) || 0
      const cumulativeCost = planRecords.reduce((sum, record) => {
        const matchedAsset = record.assets.find((item) => item.ticker === asset.ticker)
        return sum + (Number(matchedAsset?.actualAmount) || 0)
      }, 0)
      const latestPrice = latestPriceMap[asset.ticker] || 0

      return {
        ticker: asset.ticker,
        totalShares,
        averageCost: totalShares > 0 ? cumulativeCost / totalShares : 0,
        latestPrice,
      }
    })
    .filter((item) => item.totalShares > 0)

  const metrics = isOpenEnded
    ? [
        {
          label: '当前总市值',
          value: formatMoney(marketValue),
          icon: CircleDollarSign,
          tone: 'text-white',
          guide: '所有持仓按最新价格计算的总价值',
        },
        {
          label: '累计总投入',
          value: formatMoney(totalInvested),
          icon: Banknote,
          tone: 'text-white',
          guide: '你实际花出去的总金额，不含账面盈亏',
        },
        {
          label: '浮动盈亏',
          value: `${getProfitA11yLabel(floatingProfit)} ${formatSignedMoney(floatingProfit)} · ${formatPercent(floatingProfitPct)}`,
          icon: Activity,
          tone: floatingProfit >= 0 ? 'text-positive' : 'text-negative',
          guide: '当前市值 - 累计投入，文案会同时说明是盈利还是亏损，避免只靠颜色判断',
        },
        {
          label: '已坚持',
          value: `已坚持 ${planRecords.length} 期`,
          icon: ShieldEllipsis,
          tone: 'text-white',
          guide: '按记录数量统计你已经持续执行了多少期',
        },
      ]
    : [
        {
          label: '当前总市值',
          value: formatMoney(marketValue),
          icon: CircleDollarSign,
          tone: 'text-white',
          guide: '所有持仓按最新价格计算的总价值',
        },
        {
          label: '累计总投入',
          value: formatMoney(totalInvested),
          icon: Banknote,
          tone: 'text-white',
          guide: '你实际花出去的总金额，不含账面盈亏',
        },
        {
          label: '浮动盈亏',
          value: `${getProfitA11yLabel(floatingProfit)} ${formatSignedMoney(floatingProfit)} · ${formatPercent(floatingProfitPct)}`,
          icon: Activity,
          tone: floatingProfit >= 0 ? 'text-positive' : 'text-negative',
          guide: '当前市值 - 累计投入，文案会同时说明是盈利还是亏损，避免只靠颜色判断',
        },
        {
          label: '剩余子弹',
          value: formatMoney(remainingBudget),
          icon: ShieldEllipsis,
          tone: 'text-white',
          guide: '总预算里还没有投入的资金，保留底仓不能全花',
        },
      ]

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setShowGuide((current) => !current)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-line/80 bg-elevated/70 text-textSoft transition hover:border-accent/20 hover:bg-elevated"
          aria-label="切换总览说明"
        >
          <HelpCircle size={16} />
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)] lg:items-start">
        <div className="grid gap-3 sm:grid-cols-2">
          {metrics.map((metric, index) => {
            const Icon = metric.icon
            return (
              <article
                key={metric.label}
                className={`rounded-[1.6rem] border border-line/85 bg-panel/92 px-5 py-5 ${index === 0 ? 'sm:col-span-2 lg:col-span-1 lg:min-h-[176px]' : ''}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="label">{metric.label}</p>
                    <p className={`mt-5 font-mono text-[2.1rem] font-semibold tabular-nums ${metric.tone}`}>{metric.value}</p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-line/80 bg-elevated/80 text-textSoft">
                    <Icon size={18} />
                  </div>
                </div>
                {showGuide ? <GuideBadge>{metric.guide}</GuideBadge> : null}
              </article>
            )
          })}
        </div>

        {isOpenEnded ? (
          <aside className="card p-5">
            <p className="label">持仓成本</p>
            <h2 className="heading-section mt-2">平均成本</h2>
            {showGuide ? <GuideBadge>按每个标的的累计投入除以累计持仓股数，显示当前平均成本。</GuideBadge> : null}
            <div className="mt-4 divide-y divide-line/70">
              {averageCostData.length ? (
                averageCostData.map((item) => (
                  <div key={item.ticker} className="grid gap-2 py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-mono text-white">{item.ticker}</span>
                      <span className="text-sm text-textSoft">均价 {formatMoneyPrecise(item.averageCost)} / 股</span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-xs text-muted">
                      <span>持仓 {item.totalShares} 股</span>
                      <span>现价 {formatMoneyPrecise(item.latestPrice)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-textSoft">暂无可计算的持仓成本数据。</p>
              )}
            </div>
          </aside>
        ) : (
          <aside className="card p-5">
            <p className="label">资金安全垫</p>
            <h2 className="heading-section mt-2">安全底仓进度</h2>
            <p className="mt-3 text-sm text-textSoft">
              已用 {formatMoney(totalInvested)} · 保留下限 {formatMoney(reserveFloor)} · 还可动用 {formatMoney(drawableBudget)}
            </p>
            <div className="mt-5 space-y-3">
              <div className="h-2.5 rounded-full bg-elevated/80">
                <div
                  className={`h-2.5 rounded-full transition-all ${getProgressTone(progressRatio)}`}
                  style={{ width: `${Math.min(progressRatio * 100, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted">
                <span>0%</span>
                <span>{Math.round(progressRatio * 100)}%</span>
                <span>100%</span>
              </div>
            </div>
            {showGuide ? <GuideBadge>已投金额占总可投金额的比例，红色代表底仓告急</GuideBadge> : null}
          </aside>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <article className="card p-5 xl:col-span-2">
          <p className="label">目标与实际</p>
          <h3 className="heading-section mt-2">VA目标值 vs 实际持仓价值</h3>
          {showGuide ? <GuideBadge>蓝色虚线是VA目标值，白线是实际持仓价值，白线高于蓝线说明跑赢了目标</GuideBadge> : null}
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={valueCurveData}>
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    background: '#111a26',
                    border: '1px solid rgba(154,168,189,0.18)',
                    borderRadius: '1rem',
                    color: '#eef3f9',
                    boxShadow: '0 16px 32px rgba(2, 6, 18, 0.42)',
                  }}
                  labelStyle={{ color: '#eef3f9', fontWeight: 600 }}
                  itemStyle={{ color: '#c8d2e1' }}
                  cursor={{ fill: 'rgba(96,165,250,0.08)' }}
                  formatter={(value) => formatMoney(value)}
                />
                <Legend />
                <Line type="monotone" dataKey="targetValue" stroke="#60a5fa" strokeWidth={2.5} strokeDasharray="6 6" name="目标值" dot={false} />
                <Line type="monotone" dataKey="actualValue" stroke="#f8fafc" strokeWidth={2.5} name="实际持仓价值" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="card p-5">
          <p className="label">分期投入</p>
          <h3 className="heading-section mt-2">每期实际投入金额</h3>
          {showGuide ? <GuideBadge>每期实际投入金额，灰色柱子代表该期标记为本期暂停</GuideBadge> : null}
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flowData}>
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    background: '#111a26',
                    border: '1px solid rgba(154,168,189,0.18)',
                    borderRadius: '1rem',
                    color: '#eef3f9',
                    boxShadow: '0 16px 32px rgba(2, 6, 18, 0.42)',
                  }}
                  labelStyle={{ color: '#eef3f9', fontWeight: 600 }}
                  itemStyle={{ color: '#c8d2e1' }}
                  cursor={{ fill: 'rgba(96,165,250,0.08)' }}
                  formatter={(value, _name) => [formatMoney(value), '投入金额']}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                  {flowData.map((entry) => (
                    <Cell key={entry.label} fill={getTagColor(entry.tag)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {flowData.map((item) => (
              <span key={item.label} className="terminal-chip">
                {item.label} · {item.tagLabel}
              </span>
            ))}
          </div>
        </article>

        <article className="card p-5">
          <p className="label">仓位偏离</p>
          <h3 className="heading-section mt-2">当前权重 vs 目标权重</h3>
          {showGuide ? <GuideBadge>当前每个标的的持仓股数和最新价格</GuideBadge> : null}
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  contentStyle={{
                    background: '#111a26',
                    border: '1px solid rgba(154,168,189,0.18)',
                    borderRadius: '1rem',
                    color: '#eef3f9',
                    boxShadow: '0 16px 32px rgba(2, 6, 18, 0.42)',
                  }}
                  formatter={(value, _name, item) => [`${value}%`, `${item.payload.name} 当前权重`]}
                />
                <Legend />
                <Pie data={currentWeightData} dataKey="actualWeight" nameKey="name" innerRadius={70} outerRadius={110} paddingAngle={2}>
                  {currentWeightData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 divide-y divide-line/70">
            {currentWeightData.map((asset) => (
              <div key={asset.name} className="grid gap-2 py-4 first:pt-0 last:pb-0 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-mono text-white">{asset.name}</span>
                  <span className="text-textSoft">当前 {asset.actualWeight}% / 目标 {asset.targetWeight}%</span>
                </div>
                <p className="text-xs text-muted">{asset.shares} 股 · 最新价格 {formatMoney(asset.latestPrice)}</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  )
}
