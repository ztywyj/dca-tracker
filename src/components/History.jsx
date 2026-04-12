import { useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Download, FileUp, Pencil, Trash2 } from 'lucide-react'

const filters = [
  { value: 'all', label: '全部' },
  { value: 'normal', label: '正常执行' },
  { value: 'underweight', label: '主动低配' },
  { value: 'paused', label: '本期暂停' },
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
  if (tag === 'normal') return 'border-accent/22 bg-accent/8 text-sky-100'
  if (tag === 'underweight') return 'border-warning/24 bg-warning/10 text-amber-100'
  if (tag === 'paused') return 'border-line bg-elevated text-textSoft'
  return 'border-line bg-elevated text-textSoft'
}

function roundToTwo(value) {
  return Number((Number(value) || 0).toFixed(2))
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type })
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

function createEditDraft(record) {
  return {
    tag: record.tag,
    note: record.note || '',
    assets: record.assets.map((asset) => ({
      ticker: asset.ticker,
      price: Number(asset.price) || 0,
      actualShares: Number(asset.actualShares) || 0,
    })),
  }
}

function parseBackupPayload(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    return null
  }

  const nextPlans = Array.isArray(parsed.plans)
    ? parsed.plans
    : parsed.plan
      ? [parsed.plan]
      : []
  const nextRecords = Array.isArray(parsed.records) ? parsed.records : []
  const nextActivePlanId = parsed.activePlanId || nextPlans[0]?.id || null

  if (!nextPlans.length && !nextRecords.length) {
    return null
  }

  return {
    plans: nextPlans,
    plan: nextPlans[0] || null,
    activePlanId: nextActivePlanId,
    records: nextRecords,
  }
}

export default function History({ plan, records, onDeleteRecord, onEditRecord, onImportBackup }) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [expandedId, setExpandedId] = useState('')
  const [editingId, setEditingId] = useState('')
  const [editDraft, setEditDraft] = useState(null)
  const fileInputRef = useRef(null)
  const isOpenEnded = plan?.budgetMode === 'open-ended'

  const planRecords = useMemo(() => {
    const scoped = plan ? records.filter((record) => record.planId === plan.id) : []
    return scoped.slice().sort((left, right) => right.periodIndex - left.periodIndex)
  }, [plan, records])

  const filteredRecords = useMemo(() => {
    if (activeFilter === 'all') return planRecords
    return planRecords.filter((record) => record.tag === activeFilter)
  }, [activeFilter, planRecords])

  const handleExportCsv = () => {
    if (!planRecords.length) return
    const csv = toCsv(planRecords)
    downloadFile(`${plan?.name || 'dca-tracker'}-history.csv`, csv, 'text/csv;charset=utf-8;')
  }

  const handleExportJson = () => {
    const today = new Date().toISOString().slice(0, 10)
      const payload = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        plans: plan ? [plan] : [],
        activePlanId: plan?.id || null,
        plan,
        records,
      }
    downloadFile(`dca-backup-${today}.json`, JSON.stringify(payload, null, 2), 'application/json;charset=utf-8;')
  }

  const handleDelete = (record) => {
    const confirmed = window.confirm(`确认删除第${record.periodIndex + 1}期记录？此操作不可撤销`)
    if (!confirmed) {
      return
    }

    if (expandedId === record.id) {
      setExpandedId('')
    }
    if (editingId === record.id) {
      setEditingId('')
      setEditDraft(null)
    }

    onDeleteRecord?.(record.id)
  }

  const startEditing = (record) => {
    setExpandedId(record.id)
    setEditingId(record.id)
    setEditDraft(createEditDraft(record))
  }

  const cancelEditing = () => {
    setEditingId('')
    setEditDraft(null)
  }

  const updateDraftAsset = (ticker, patch) => {
    setEditDraft((current) => ({
      ...current,
      assets: current.assets.map((asset) => (asset.ticker === ticker ? { ...asset, ...patch } : asset)),
    }))
  }

  const handleSaveEdit = (record) => {
    if (!editDraft) {
      return
    }

    const nextAssets = record.assets.map((asset) => {
      const patch = editDraft.assets.find((item) => item.ticker === asset.ticker)
      const price = roundToTwo(patch?.price ?? asset.price)
      const actualShares = Number(patch?.actualShares) || 0
      return {
        ...asset,
        price,
        actualShares,
        actualAmount: roundToTwo(price * actualShares),
      }
    })

    const totalActualAmount = roundToTwo(nextAssets.reduce((sum, asset) => sum + (Number(asset.actualAmount) || 0), 0))

    onEditRecord?.({
      ...record,
      tag: editDraft.tag,
      note: editDraft.note,
      assets: nextAssets,
      totalActualAmount,
    })

    setEditingId('')
    setEditDraft(null)
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    try {
      const content = await file.text()
      const parsed = JSON.parse(content)
      const payload = parseBackupPayload(parsed)

      if (!payload) {
        window.alert('文件格式不正确，请使用本工具导出的 JSON 备份文件。')
        return
      }

      const confirmed = window.confirm('导入将覆盖当前所有数据，确认继续？')
      if (!confirmed) {
        return
      }

      cancelEditing()
      setExpandedId('')
      onImportBackup?.(payload)
    } catch {
      window.alert('文件格式不正确，请使用本工具导出的 JSON 备份文件。')
    }
  }

  if (!plan) {
    return (
      <section className="card p-6 text-center text-textSoft">
        请先创建计划，历史记录会在执行后自动累积。
      </section>
    )
  }

  return (
    <section className="space-y-5">
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="label">执行档案</p>
            <h2 className="heading-section mt-2">历史记录</h2>
                        <p className="body-copy mt-2">
                          {isOpenEnded ? '当前为无限定投模式，历史会持续累计，不设结束期数。' : '当前为固定预算模式，历史记录会跟随总期数推进。'}
                        </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={!planRecords.length}
              className="inline-flex items-center gap-2 rounded-2xl border border-accent/20 bg-accent/10 px-4 py-2 text-sm text-slate-100 transition hover:border-accent/28 hover:bg-accent/14 disabled:cursor-not-allowed disabled:border-line disabled:bg-elevated disabled:text-muted"
            >
              <Download size={16} />
              导出 CSV
            </button>
            <button
              type="button"
              onClick={handleExportJson}
              className="inline-flex items-center gap-2 rounded-2xl border border-line bg-elevated px-4 py-2 text-sm text-textSoft transition hover:border-info/30 hover:bg-info/10 hover:text-sky-200"
            >
              <Download size={16} />
              导出 JSON
            </button>
            <button
              type="button"
              onClick={handleImportClick}
              className="inline-flex items-center gap-2 rounded-2xl border border-line bg-transparent px-4 py-2 text-sm text-textSoft transition hover:border-accent/30 hover:bg-elevated"
            >
              <FileUp size={16} />
              导入 JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              aria-label="选择要导入的 JSON 备份文件"
              className="hidden"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setActiveFilter(filter.value)}
                          className={`rounded-full px-4 py-2 text-sm transition ${
                            activeFilter === filter.value ? 'border border-accent/18 bg-accent/10 text-slate-100' : 'border border-line/80 bg-elevated/75 text-textSoft hover:border-line hover:bg-panel'
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
            const editing = editingId === record.id && editDraft
            return (
              <article key={record.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">第 {record.periodIndex + 1} 期</h3>
                      <span className="font-mono text-sm text-muted">{record.date.slice(0, 10)}</span>
                      <span className={`rounded-full border px-3 py-1 text-xs ${getTagClass(record.tag)}`}>
                        {filters.find((filter) => filter.value === record.tag)?.label || record.tag}
                      </span>
                    </div>
                    <p className="font-mono text-2xl text-white">{formatMoney(record.totalActualAmount)}</p>
                    <p className="line-clamp-2 max-w-3xl text-sm text-textSoft">{record.note || '本期未填写备注。'}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? '' : record.id)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-line bg-elevated px-4 py-2 text-sm text-textSoft transition hover:border-accent/30 hover:bg-panel"
                    >
                      {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      {expanded ? '收起详情' : '展开详情'}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEditing(record)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-line bg-elevated px-4 py-2 text-sm text-positive transition hover:border-positive/35 hover:bg-positive/10"
                    >
                      <Pencil size={16} />
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(record)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-line bg-elevated px-4 py-2 text-sm text-negative transition hover:border-negative/35 hover:bg-negative/10"
                    >
                      <Trash2 size={16} />
                      删除
                    </button>
                  </div>
                </div>

                {editing ? (
                  <div className="mt-5 space-y-4 border-t border-line pt-5">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {record.assets.map((asset) => {
                        const draftAsset = editDraft.assets.find((item) => item.ticker === asset.ticker) || {
                          price: Number(asset.price) || 0,
                          actualShares: Number(asset.actualShares) || 0,
                        }

                        return (
                          <div key={asset.ticker} className="rounded-3xl border border-line bg-elevated p-4">
                            <p className="font-mono text-base text-white">{asset.ticker}</p>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              <label className="space-y-2">
                                <span className="text-sm text-textSoft">操作价格</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={draftAsset.price}
                                  onChange={(event) => updateDraftAsset(asset.ticker, { price: Number(event.target.value) })}
                                  className="w-full rounded-2xl border border-line/80 bg-surface px-4 py-3 font-mono text-white outline-none transition focus:border-accent/35 focus:bg-elevated"
                                />
                              </label>
                              <label className="space-y-2">
                                <span className="text-sm text-textSoft">实际买入股数</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={draftAsset.actualShares}
                                  onChange={(event) => updateDraftAsset(asset.ticker, { actualShares: Number(event.target.value) })}
                                  className="w-full rounded-2xl border border-line/80 bg-surface px-4 py-3 font-mono text-white outline-none transition focus:border-accent/35 focus:bg-elevated"
                                />
                              </label>
                            </div>
                            <p className="mt-3 text-sm text-textSoft">
                              实际投入：<span className="font-mono text-white">{formatMoney(roundToTwo((Number(draftAsset.price) || 0) * (Number(draftAsset.actualShares) || 0)))}</span>
                            </p>
                          </div>
                        )
                      })}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-sm text-textSoft">决策标签</span>
                        <select
                          value={editDraft.tag}
                          onChange={(event) => setEditDraft((current) => ({ ...current, tag: event.target.value }))}
                          className="w-full rounded-2xl border border-white/10 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent"
                        >
                          {filters.filter((filter) => filter.value !== 'all').map((filter) => (
                            <option key={filter.value} value={filter.value}>
                              {filter.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-2">
                        <span className="text-sm text-textSoft">备注</span>
                        <textarea
                          rows="4"
                          value={editDraft.note}
                          onChange={(event) => setEditDraft((current) => ({ ...current, note: event.target.value }))}
                          className="w-full rounded-2xl border border-white/10 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent"
                        />
                      </label>
                    </div>

                    <div className="flex flex-wrap justify-end gap-3">
                      <button
                        type="button"
                        onClick={cancelEditing}
                        className="rounded-2xl border border-line/80 bg-elevated/70 px-4 py-3 text-sm text-textSoft transition hover:border-line hover:bg-panel"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(record)}
                        className="rounded-2xl border border-accent/20 bg-accent/12 px-4 py-3 text-sm font-medium text-slate-100 transition hover:border-accent/28 hover:bg-accent/16"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                ) : expanded ? (
                  <div className="mt-5 space-y-3 border-t border-line pt-5">
                    {record.assets.map((asset) => (
                      <div key={asset.ticker} className="rounded-2xl border border-line/80 bg-elevated/70 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
                          <div>
                            <p className="font-mono text-base text-white">{asset.ticker}</p>
                            <p className="mt-1 text-xs text-muted">价格来源：{asset.priceSource === 'auto' ? '自动' : '手动'}</p>
                          </div>
                          <div className="text-right text-sm text-textSoft">
                            <p>价格：<span className="font-mono text-white">{formatMoney(asset.price)}</span></p>
                            <p>目标值：<span className="font-mono text-white">{formatMoney(asset.targetValue)}</span></p>
                          </div>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="rounded-2xl border border-line/80 bg-surface p-3">
                            <p className="label">前持仓价值</p>
                            <p className="mt-2 font-mono text-white">{formatMoney(asset.currentValueBefore)}</p>
                          </div>
                          <div className="rounded-2xl border border-line/80 bg-surface p-3">
                            <p className="label">建议买入</p>
                            <p className="mt-2 font-mono text-white">{formatMoney(asset.requiredAmount)}</p>
                          </div>
                          <div className="rounded-2xl border border-line/80 bg-surface p-3">
                            <p className="label">建议股数</p>
                            <p className="mt-2 font-mono text-white">{asset.suggestedShares}</p>
                          </div>
                          <div className="rounded-2xl border border-line/80 bg-surface p-3">
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
          <div className="card p-8 text-center text-muted">
            当前筛选条件下还没有记录。
          </div>
        )}
      </div>
    </section>
  )
}
