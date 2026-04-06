import { useMemo, useState } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'

const strategyOptions = [
  { value: 'VA', label: 'VA定投' },
  { value: 'DCA', label: 'DCA定额' },
]

const frequencyOptions = [
  { value: 'biweekly', label: '双周' },
  { value: 'monthly', label: '月' },
]

function createDraftPlan() {
  return {
    id: '',
    name: '',
    strategy: 'VA',
    totalBudget: 10000,
    reserveRatio: 0.2,
    totalPeriods: 24,
    currentPeriod: 0,
    frequency: 'monthly',
    targetAnnualReturn: 0.25,
    assets: [],
    createdAt: '',
  }
}

function createAssetDraft() {
  return {
    ticker: '',
    name: '',
    weight: 0.1,
    currentShares: 0,
  }
}

function formatMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function generateId() {
  return `plan-${Date.now()}`
}

export default function Settings({ plan, onSavePlan, onNavigate }) {
  const [form, setForm] = useState(() => (plan ? { ...plan, assets: [...plan.assets] } : createDraftPlan()))
  const [showAssetForm, setShowAssetForm] = useState(false)
  const [assetDraft, setAssetDraft] = useState(createAssetDraft())

  const totalWeight = useMemo(
    () => form.assets.reduce((sum, asset) => sum + (Number(asset.weight) || 0), 0),
    [form.assets],
  )

  const reservedCash = (Number(form.totalBudget) || 0) * (Number(form.reserveRatio) || 0)
  const deployableCash = (Number(form.totalBudget) || 0) - reservedCash
  const isWeightValid = form.assets.length > 0 && Math.abs(totalWeight - 1) < 0.001
  const canSave = form.name.trim() && Number(form.totalBudget) > 0 && Number(form.totalPeriods) > 0 && isWeightValid

  const updateField = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
    }))
  }

  const saveAssetDraft = () => {
    if (!assetDraft.ticker.trim()) {
      return
    }

    setForm((current) => ({
      ...current,
      assets: [
        ...current.assets,
        {
          ticker: assetDraft.ticker.trim().toUpperCase(),
          name: assetDraft.name.trim() || assetDraft.ticker.trim().toUpperCase(),
          weight: Number(assetDraft.weight) || 0,
          currentShares: Number(assetDraft.currentShares) || 0,
        },
      ],
    }))

    setAssetDraft(createAssetDraft())
    setShowAssetForm(false)
  }

  const removeAsset = (ticker) => {
    setForm((current) => ({
      ...current,
      assets: current.assets.filter((asset) => asset.ticker !== ticker),
    }))
  }

  const updateAssetWeight = (ticker, weight) => {
    setForm((current) => ({
      ...current,
      assets: current.assets.map((asset) =>
        asset.ticker === ticker
          ? {
              ...asset,
              weight,
            }
          : asset,
      ),
    }))
  }

  const handleSave = () => {
    if (!canSave) {
      return
    }

    const nextPlan = {
      ...form,
      id: form.id || generateId(),
      name: form.name.trim(),
      totalBudget: Number(form.totalBudget) || 0,
      reserveRatio: Number(form.reserveRatio) || 0.2,
      totalPeriods: Number(form.totalPeriods) || 1,
      currentPeriod: Number(form.currentPeriod) || 0,
      targetAnnualReturn: Number(form.targetAnnualReturn) || 0.25,
      createdAt: form.createdAt || new Date().toISOString(),
      assets: form.assets.map((asset) => ({
        ...asset,
        ticker: asset.ticker.trim().toUpperCase(),
        name: asset.name?.trim() || asset.ticker.trim().toUpperCase(),
        weight: Number(asset.weight) || 0,
        currentShares: Number(asset.currentShares) || 0,
      })),
    }

    onSavePlan(nextPlan)
    onNavigate('dashboard')
  }

  const handleCreateNew = () => {
    setForm(createDraftPlan())
    setShowAssetForm(false)
    setAssetDraft(createAssetDraft())
  }

  return (
    <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="label">Plan configuration</p>
            <h2 className="mt-2 text-xl font-semibold text-white">计划设置</h2>
            <p className="mt-2 text-sm text-slate-400">
              {plan ? `当前计划：${plan.name}` : '首次进入请先创建计划，保存后将进入总览页。'}
            </p>
          </div>
          {plan ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...plan, assets: [...plan.assets] })}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
              >
                修改计划
              </button>
              <button
                type="button"
                onClick={handleCreateNew}
                className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent transition hover:bg-accent/20"
              >
                新建计划
              </button>
            </div>
          ) : null}
        </div>

        <div className="mt-6 grid gap-5">
          <label className="space-y-2">
            <span className="text-sm text-slate-300">计划名称</span>
            <input
              type="text"
              value={form.name}
              placeholder="例如：2026美股VA定投"
              onChange={(event) => updateField('name', event.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent"
            />
          </label>

          <div className="space-y-3">
            <span className="text-sm text-slate-300">策略类型</span>
            <div className="grid gap-3 sm:grid-cols-2">
              {strategyOptions.map((option) => (
                <label
                  key={option.value}
                  className={`rounded-2xl border px-4 py-3 transition ${
                    form.strategy === option.value ? 'border-accent bg-accent/10 text-white' : 'border-white/10 bg-white/5 text-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="strategy"
                    value={option.value}
                    checked={form.strategy === option.value}
                    onChange={() => updateField('strategy', option.value)}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-slate-300">总预算（美元）</span>
              <input
                type="number"
                min="0"
                value={form.totalBudget}
                onChange={(event) => updateField('totalBudget', Number(event.target.value))}
                className="w-full rounded-2xl border border-white/10 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm text-slate-300">总期数</span>
              <input
                type="number"
                min="1"
                value={form.totalPeriods}
                onChange={(event) => updateField('totalPeriods', Number(event.target.value))}
                className="w-full rounded-2xl border border-white/10 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent"
              />
            </label>
          </div>

          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-300">保留现金比例</span>
              <span className="font-mono text-white">{Math.round((Number(form.reserveRatio) || 0) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="0.3"
              step="0.01"
              value={form.reserveRatio}
              onChange={(event) => updateField('reserveRatio', Number(event.target.value))}
              className="w-full accent-blue-400"
            />
            <p className="text-sm text-slate-400">
              保留 {formatMoney(reservedCash)}，可投 {formatMoney(deployableCash)}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-slate-300">定投频率</span>
              <select
                value={form.frequency}
                onChange={(event) => updateField('frequency', event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent"
              >
                {frequencyOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            {form.strategy === 'VA' ? (
              <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-300">目标年化收益率</span>
                  <span className="font-mono text-white">{Math.round((Number(form.targetAnnualReturn) || 0) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.5"
                  step="0.01"
                  value={form.targetAnnualReturn}
                  onChange={(event) => updateField('targetAnnualReturn', Number(event.target.value))}
                  className="w-full accent-blue-400"
                />
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
                DCA 策略不需要设置目标年化收益率。
              </div>
            )}
          </div>

          <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">资产配置</p>
                <p className="mt-1 text-xs text-slate-400">所有权重之和必须等于 100%</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAssetForm((current) => !current)}
                className="inline-flex items-center gap-2 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-2 text-sm text-accent transition hover:bg-accent/20"
              >
                <Plus size={16} />
                添加标的
              </button>
            </div>

            {showAssetForm ? (
              <div className="grid gap-3 rounded-2xl border border-white/10 bg-surface p-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm text-slate-300">Ticker</span>
                  <input
                    type="text"
                    value={assetDraft.ticker}
                    onChange={(event) => setAssetDraft((current) => ({ ...current, ticker: event.target.value.toUpperCase() }))}
                    className="w-full rounded-2xl border border-white/10 bg-panel px-4 py-3 text-white outline-none transition focus:border-accent"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-300">显示名称</span>
                  <input
                    type="text"
                    value={assetDraft.name}
                    onChange={(event) => setAssetDraft((current) => ({ ...current, name: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-panel px-4 py-3 text-white outline-none transition focus:border-accent"
                  />
                </label>
                <div className="space-y-3 sm:col-span-2">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-sm text-slate-300">权重</span>
                    <span className="font-mono text-white">{Math.round((Number(assetDraft.weight) || 0) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1"
                    step="0.01"
                    value={assetDraft.weight}
                    onChange={(event) => setAssetDraft((current) => ({ ...current, weight: Number(event.target.value) }))}
                    className="w-full accent-blue-400"
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end">
                  <button
                    type="button"
                    onClick={saveAssetDraft}
                    className="rounded-2xl bg-accent px-4 py-2 text-sm font-medium text-slate-950 transition hover:brightness-110"
                  >
                    添加到计划
                  </button>
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              {form.assets.length ? (
                form.assets.map((asset) => (
                  <div key={asset.ticker} className="rounded-2xl border border-white/10 bg-surface p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-base text-white">{asset.ticker}</p>
                        <p className="text-xs text-slate-400">{asset.name}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAsset(asset.ticker)}
                        className="inline-flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 transition hover:bg-red-500/20"
                      >
                        <Trash2 size={14} />
                        删除
                      </button>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between gap-4 text-sm text-slate-300">
                        <span>权重</span>
                        <span className="font-mono text-white">{Math.round((Number(asset.weight) || 0) * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={asset.weight}
                        onChange={(event) => updateAssetWeight(asset.ticker, Number(event.target.value))}
                        className="w-full accent-blue-400"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-500">
                  还没有添加标的，请至少添加一个资产。
                </div>
              )}
            </div>

            <div className={`rounded-2xl border px-4 py-3 text-sm ${isWeightValid ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-200'}`}>
              当前总权重：{Math.round(totalWeight * 100)}%
              {!isWeightValid ? '，请调整到 100% 后才能保存。' : '，可以保存计划。'}
            </div>
          </div>
        </div>
      </div>

      <aside className="card p-5">
        <p className="label">Plan summary</p>
        <h3 className="mt-2 text-xl font-semibold text-white">保存前检查</h3>
        <div className="mt-6 space-y-4 text-sm leading-7 text-slate-300">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p>策略：<span className="font-medium text-white">{form.strategy}</span></p>
            <p>频率：<span className="font-medium text-white">{form.frequency === 'biweekly' ? '双周' : '月'}</span></p>
            <p>总预算：<span className="font-mono text-white">{formatMoney(form.totalBudget)}</span></p>
            <p>可投资金：<span className="font-mono text-accent">{formatMoney(deployableCash)}</span></p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p>标的数量：<span className="text-white">{form.assets.length}</span></p>
            <p>当前期数：<span className="text-white">第 {Number(form.currentPeriod) + 1} 期</span></p>
            <p>目标年化：<span className="text-white">{form.strategy === 'VA' ? `${Math.round((Number(form.targetAnnualReturn) || 0) * 100)}%` : '不适用'}</span></p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 font-medium text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            <Save size={18} />
            保存计划
          </button>
        </div>
      </aside>
    </section>
  )
}
