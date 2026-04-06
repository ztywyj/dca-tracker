import { useState } from 'react'
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

const PIE_COLORS = ['#60a5fa', '#22c55e', '#f59e0b', '#ef4444', '#a78bfa', '#14b8a6']

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function formatPercent(value) {
  const numeric = Number(value) || 0
  return `${numeric >= 0 ? '+' : ''}${numeric.toFixed(2)}%`
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
  if (tag === 'paused') return '#475569'
  return '#60a5fa'
}

function GuideBadge({ children }) {
  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-panel px-3 py-2 text-xs leading-5 text-slate-300">
      {children}
    </div>
  )
}

export default function Dashboard({ plan, records, onNavigate }) {
  const [showGuide, setShowGuide] = useState(false)

  if (!plan) {
    return (
      <section className="card p-6 text-center text-slate-300">
        还没有计划，先去设置页创建你的第一份定投计划吧。
      </section>
    )
  }

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
            <h2 className="mt-3 text-2xl font-semibold text-white">还没有操作记录，去完成第一期定投吧</h2>
            <p className="mt-3 text-sm text-slate-400">创建好计划后，前往“本期操作”录入第一期价格与买入股数。</p>
          </div>
          <button
            type="button"
            onClick={() => setShowGuide((current) => !current)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
            aria-label="切换总览说明"
          >
            <HelpCircle size={16} />
          </button>
        </div>
        {showGuide ? <GuideBadge>总览页会在你产生第一条记录后，展示关键指标、资金进度和图表解释。</GuideBadge> : null}
        <button
          type="button"
          onClick={() => onNavigate('operation')}
          className="mt-6 rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
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

  const metrics = [
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
      value: `${formatMoney(floatingProfit)} · ${formatPercent(floatingProfitPct)}`,
      icon: Activity,
      tone: floatingProfit >= 0 ? 'text-positive' : 'text-negative',
      guide: '当前市值 - 累计投入，绿色赚钱红色亏损',
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
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10"
          aria-label="切换总览说明"
        >
          <HelpCircle size={16} />
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <article key={metric.label} className="card p-5">
              <div className="flex items-center justify-between">
                <p className="label">{metric.label}</p>
                <Icon size={18} className="text-accent" />
              </div>
              <p className={`mt-6 font-mono text-3xl font-semibold ${metric.tone}`}>{metric.value}</p>
              {showGuide ? <GuideBadge>{metric.guide}</GuideBadge> : null}
            </article>
          )
        })}
      </div>

      <div className="card p-5">
        <p className="label">资金安全垫</p>
        <h2 className="mt-2 text-xl font-semibold text-white">安全底仓进度</h2>
        <p className="mt-3 text-sm text-slate-300">
          已用 {formatMoney(totalInvested)} · 保留下限 {formatMoney(reserveFloor)} · 还可动用 {formatMoney(drawableBudget)}
        </p>
        <div className="mt-4 h-3 rounded-full bg-white/10">
          <div
            className={`h-3 rounded-full transition-all ${getProgressTone(progressRatio)}`}
            style={{ width: `${Math.min(progressRatio * 100, 100)}%` }}
          />
        </div>
        {showGuide ? <GuideBadge>已投金额占总可投金额的比例，红色代表底仓告急</GuideBadge> : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <article className="card p-5 xl:col-span-2">
          <p className="label">目标与实际</p>
          <h3 className="mt-2 text-xl font-semibold text-white">VA目标值 vs 实际持仓价值</h3>
          {showGuide ? <GuideBadge>蓝色虚线是VA目标值，白线是实际持仓价值，白线高于蓝线说明跑赢了目标</GuideBadge> : null}
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={valueCurveData}>
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    background: '#151925',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '1rem',
                    color: '#fff',
                  }}
                  labelStyle={{ color: '#f8fafc', fontWeight: 600 }}
                  itemStyle={{ color: '#e2e8f0' }}
                  cursor={{ fill: 'rgba(255,255,255,0.06)' }}
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
          <h3 className="mt-2 text-xl font-semibold text-white">每期实际投入金额</h3>
          {showGuide ? <GuideBadge>每期实际投入金额，灰色柱子代表该期标记为本期暂停</GuideBadge> : null}
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flowData}>
                <XAxis dataKey="label" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{
                    background: '#151925',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '1rem',
                    color: '#fff',
                  }}
                  labelStyle={{ color: '#f8fafc', fontWeight: 600 }}
                  itemStyle={{ color: '#e2e8f0' }}
                  cursor={{ fill: 'rgba(255,255,255,0.06)' }}
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
              <span key={item.label} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                {item.label} · {item.tagLabel}
              </span>
            ))}
          </div>
        </article>

        <article className="card p-5">
          <p className="label">仓位偏离</p>
          <h3 className="mt-2 text-xl font-semibold text-white">当前权重 vs 目标权重</h3>
          {showGuide ? <GuideBadge>当前每个标的的持仓股数和最新价格</GuideBadge> : null}
          <div className="mt-6 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  contentStyle={{
                    background: '#151925',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '1rem',
                    color: '#fff',
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
          <div className="mt-4 space-y-3">
            {currentWeightData.map((asset) => (
              <div key={asset.name} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-white">{asset.name}</span>
                  <span className="text-slate-300">当前 {asset.actualWeight}% / 目标 {asset.targetWeight}%</span>
                </div>
                <p className="mt-2 text-xs text-slate-400">{asset.shares} 股 · 最新价格 {formatMoney(asset.latestPrice)}</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  )
}
