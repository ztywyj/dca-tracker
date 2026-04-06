import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Download } from 'lucide-react'

const filters = [
  { value: 'all', label: 'All' },
  { value: 'normal', label: '正常执行' },
  { value: 'underweight', label: '主动低配' },
  { value: 'waiting', label: '等待触发' },
  { value: 'paused', label: '暂停' },
]

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function getTagClass(tag) {
  if (tag === 'normal') return 'border-accent/30 bg-accent/10 text-accent'
  if (tag === 'underweight') return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
  if (tag === 'waiting') return 'border-slate-500/30 bg-slate-500/10 text-slate-300'
  if (tag === 'paused') return 'border-red-500/30 bg-red-500/10 text-red-300'
  return 'border-white/10 bg-white/5 text-slate-300'
}

function downloadCsv(filename, content) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function toCsv(records) {
  const header = [
    'periodIndex',
    'date',
    'tag',
    'note',
    'ticker',
    'price',
    'priceSource',
    'targetValue',
    'currentValueBefore',
    'requiredAmount',
    'suggestedShares',
    'actualShares',
    'actualAmount',
    'totalActualAmount',
    'cumulativeInvested',
    'remainingBudget',
  ]

  const rows = records.flatMap((record) =>
    record.assets.map((asset) => [
      record.periodIndex + 1,
      record.date,
      record.tag,
      (record.note || '').replaceAll(',', '，').replaceAll('\n', ' '),
      asset.ticker,
      asset.price,
      asset.priceSource,
      asset.targetValue,
      asset.currentValueBefore,
      asset.requiredAmount,
      asset.suggestedShares,
      asset.actualShares,
      asset.actualAmount,
      record.totalActualAmount,
      record.cumulativeInvested,
      record.remainingBudget,
    ]),
  )

  return [header, ...rows].map((row) => row.join(',')).join('\n')
}

export default function History({ plan, records }) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [expandedId, setExpandedId] = useState('')

  const planRecords = useMemo(() => {
    const scoped = plan ? records.filter((record) => record.planId === plan.id) : []
    return scoped.slice().sort((left, right) => right.periodIndex - left.periodIndex)
  }, [plan, records])

  const filteredRecords = useMemo(() => {
    if (activeFilter === 'all') return planRecords
    return planRecords.filter((record) => record.tag === activeFilter)
  }, [activeFilter, planRecords])

  const handleExport = () => {
    if (!planRecords.length) return
    const csv = toCsv(planRecords)
    downloadCsv(`${plan?.name || 'dca-tracker'}-history.csv`, csv)
  }

  if (!plan) {
    return (
      <section className="card p-6 text-center text-slate-300">
        请先创建计划，历史记录会在执行后自动累积。
      </section>
    )
  }

  return (
    <section className="space-y-5">
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="label">Execution archive</p>
            <h2 className="mt-2 text-xl font-semibold text-white">历史记录</h2>
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={!planRecords.length}
            className="inline-flex items-center gap-2 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent transition hover:bg-accent/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-500"
          >
            <Download size={16} />
            导出 CSV
          </button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActiveFilter(filter.value)}
              className={`rounded-full px-4 py-2 text-sm transition ${
                activeFilter === filter.value ? 'bg-accent text-slate-950' : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filteredRecords.length ? (
          filteredRecords.map((record) => {
            const expanded = expandedId === record.id
            return (
              <article key={record.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">第 {record.periodIndex + 1} 期</h3>
                      <span className="font-mono text-sm text-slate-400">{record.date.slice(0, 10)}</span>
                      <span className={`rounded-full border px-3 py-1 text-xs ${getTagClass(record.tag)}`}>
                        {filters.find((filter) => filter.value === record.tag)?.label || record.tag}
                      </span>
                    </div>
                    <p className="font-mono text-2xl text-white">{formatMoney(record.totalActualAmount)}</p>
                    <p className="line-clamp-2 max-w-3xl text-sm text-slate-400">{record.note || '本期未填写备注。'}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? '' : record.id)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/10"
                  >
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    {expanded ? '收起详情' : '展开详情'}
                  </button>
                </div>

                {expanded ? (
                  <div className="mt-5 space-y-3 border-t border-white/10 pt-5">
                    {record.assets.map((asset) => (
                      <div key={asset.ticker} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-mono text-base text-white">{asset.ticker}</p>
                            <p className="mt-1 text-xs text-slate-400">价格来源：{asset.priceSource === 'auto' ? '自动' : '手动'}</p>
                          </div>
                          <div className="text-right text-sm text-slate-300">
                            <p>价格：<span className="font-mono text-white">{formatMoney(asset.price)}</span></p>
                            <p>目标值：<span className="font-mono text-white">{formatMoney(asset.targetValue)}</span></p>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-4">
                          <div className="rounded-2xl border border-white/10 bg-surface p-3">
                            <p className="label">前持仓价值</p>
                            <p className="mt-2 font-mono text-white">{formatMoney(asset.currentValueBefore)}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-surface p-3">
                            <p className="label">建议买入</p>
                            <p className="mt-2 font-mono text-white">{formatMoney(asset.requiredAmount)}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-surface p-3">
                            <p className="label">建议股数</p>
                            <p className="mt-2 font-mono text-white">{asset.suggestedShares}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-surface p-3">
                            <p className="label">实际买入</p>
                            <p className="mt-2 font-mono text-white">{asset.actualShares} 股 / {formatMoney(asset.actualAmount)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            )
          })
        ) : (
          <div className="card p-8 text-center text-slate-400">
            当前筛选条件下还没有记录。
          </div>
        )}
      </div>
    </section>
  )
}
