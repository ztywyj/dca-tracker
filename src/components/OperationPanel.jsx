import { useEffect, useMemo, useRef, useState } from 'react'
import { CalendarDays, LoaderCircle, RefreshCcw } from 'lucide-react'
import { formatNumericInput, normalizeNumericInput, toNumberOrFallback } from '../utils/numericInput'
import { getPeriodicAmount, getSuggestedShares as getDcaSuggestedShares } from '../utils/dcaCalc'
import {
  calcAllTargets,
  getInitialTargetValue,
  getRequiredInvestment,
  getSuggestedShares as getVaSuggestedShares,
  getUpdatedShares,
} from '../utils/vaCalc'
import { fetchQuote } from '../hooks/useQuote'

const decisionOptions = [
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

function roundToTwo(value) {
  return Number((Number(value) || 0).toFixed(2))
}

export default function OperationPanel({ plan, records, onSaveRecord, onNavigate }) {
  const [operationDate, setOperationDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [tag, setTag] = useState('normal')
  const [note, setNote] = useState('')
  const [assetStates, setAssetStates] = useState([])
  const dateInputRef = useRef(null)

  const targetMatrix = useMemo(() => (plan ? calcAllTargets(plan) : []), [plan])
  const isOpenEnded = plan?.budgetMode === 'open-ended'

  useEffect(() => {
    if (!plan?.assets?.length) {
      setAssetStates([])
      return
    }

    const currentPeriod = plan?.budgetMode === 'open-ended'
      ? Math.max(Number(plan.currentPeriod) || 0, 0)
      : Math.min(Number(plan.currentPeriod) || 0, Math.max(0, (Number(plan.totalPeriods) || 1) - 1))
    const targetMatrix = calcAllTargets(plan)

    setAssetStates(
      plan.assets.map((asset, index) => {
        const bootstrapTargetValue = plan.strategy === 'VA'
          ? currentPeriod === 0
            ? getInitialTargetValue(asset.weight, plan)
            : Number(targetMatrix?.[currentPeriod]?.[index] || 0)
          : getPeriodicAmount(plan, asset.weight)
        const bootstrapRequiredAmount = plan.strategy === 'VA'
          ? currentPeriod === 0
            ? bootstrapTargetValue
            : getRequiredInvestment(0, bootstrapTargetValue)
          : getPeriodicAmount(plan, asset.weight)

        return {
          ticker: asset.ticker,
          price: '',
          priceSource: 'manual',
          loading: false,
          actualShares: '',
          defaultSuggestedShares: 0,
          bootstrapRequiredAmount,
          fetchError: '',
        }
      }),
    )
  }, [plan])

  if (!plan) {
    return (
      <section className="card p-6 text-center text-textSoft">
        请先创建计划，再进入本期操作页。
      </section>
    )
  }

  const currentPeriod = isOpenEnded
    ? Math.max(Number(plan.currentPeriod) || 0, 0)
    : Math.min(Number(plan.currentPeriod) || 0, Math.max(0, (Number(plan.totalPeriods) || 1) - 1))
  const latestRecord = records.find((record) => record.planId === plan.id && record.periodIndex === currentPeriod - 1)

  const currentAssets = plan.assets.map((asset, index) => {
    const state = assetStates.find((item) => item.ticker === asset.ticker) || {
      ticker: asset.ticker,
      price: '',
      priceSource: 'manual',
      loading: false,
      actualShares: '',
      fetchError: '',
    }

    const price = toNumberOrFallback(state.price, 0)
    const currentValueBefore = roundToTwo((Number(asset.currentShares) || 0) * price)
    const targetValue = plan.strategy === 'VA'
      ? currentPeriod === 0
        ? getInitialTargetValue(asset.weight, plan)
        : Number(targetMatrix?.[currentPeriod]?.[index] || 0)
      : getPeriodicAmount(plan, asset.weight)
    const requiredAmount = plan.strategy === 'VA'
      ? currentPeriod === 0
        ? roundToTwo(targetValue)
        : getRequiredInvestment(currentValueBefore, targetValue)
      : getPeriodicAmount(plan, asset.weight)
    const suggestedShares = plan.strategy === 'VA'
      ? getVaSuggestedShares(requiredAmount, price)
      : getDcaSuggestedShares(requiredAmount, price)
    const hasManualActualShares = state.actualShares !== ''
    const actualShares = hasManualActualShares ? roundToTwo(toNumberOrFallback(state.actualShares, 0)) : roundToTwo(suggestedShares)
    const actualAmount = roundToTwo(actualShares * price)

    return {
      ...asset,
      ...state,
      currentValueBefore,
      targetValue: roundToTwo(targetValue),
      requiredAmount: roundToTwo(requiredAmount),
      suggestedShares,
      suggestedSharesDisplay: formatNumericInput(suggestedShares),
      actualSharesInput: state.actualShares,
      actualSharesDisplay: hasManualActualShares ? state.actualShares : formatNumericInput(suggestedShares),
      hasManualActualShares,
      actualShares,
      actualAmount,
    }
  })

  const totalActualAmount = roundToTwo(currentAssets.reduce((sum, asset) => sum + asset.actualAmount, 0))
  const historicalInvested = records
    .filter((record) => record.planId === plan.id)
    .reduce((sum, record) => sum + (Number(record.totalActualAmount) || 0), 0)
  const cumulativeInvested = roundToTwo(historicalInvested + totalActualAmount)
  const remainingBudget = isOpenEnded ? 0 : roundToTwo((Number(plan.totalBudget) || 0) - cumulativeInvested)

  const updateAssetState = (ticker, patch) => {
    setAssetStates((current) =>
      current.map((asset) => (asset.ticker === ticker ? { ...asset, ...patch } : asset)),
    )
  }

  const handleAutoFetch = async (ticker) => {
    updateAssetState(ticker, { loading: true, fetchError: '' })
    const result = await fetchQuote(ticker)

    if (typeof result.price === 'number') {
      updateAssetState(ticker, {
        loading: false,
        price: typeof result.price === 'number' ? formatNumericInput(result.price) : '',
        priceSource: 'auto',
        fetchError: '',
      })
      return
    }

    updateAssetState(ticker, {
      loading: false,
      priceSource: 'manual',
      fetchError: result.error || '获取失败，请手动输入。',
    })
  }

  const handleConfirm = () => {
    const record = {
      id: `record-${Date.now()}`,
      planId: plan.id,
      periodIndex: currentPeriod,
      date: new Date(operationDate).toISOString(),
      assets: currentAssets.map((asset) => ({
        ticker: asset.ticker,
        price: toNumberOrFallback(asset.price, 0),
        priceSource: asset.priceSource === 'auto' ? 'auto' : 'manual',
        targetValue: asset.targetValue,
        currentValueBefore: asset.currentValueBefore,
        requiredAmount: asset.requiredAmount,
        suggestedShares: asset.suggestedShares,
        actualShares: asset.actualShares,
        actualAmount: asset.actualAmount,
      })),
      tag,
      note,
      totalActualAmount,
      cumulativeInvested,
      remainingBudget,
    }

    const nextPlan = {
      ...plan,
      currentPeriod: (Number(plan.currentPeriod) || 0) + 1,
      assets: plan.assets.map((asset) => {
        const currentAsset = currentAssets.find((item) => item.ticker === asset.ticker)
        return {
          ...asset,
          currentShares: getUpdatedShares(asset.currentShares, currentAsset?.actualShares || 0),
        }
      }),
    }

    onSaveRecord(record, nextPlan)
    onNavigate('history')
  }

  return (
    <section className="space-y-5">
      <div className="card p-5">
        <div className="flex flex-col gap-4">
          <div>
            <p className="label">本期操作</p>
            <h2 className="heading-section mt-2 text-white/92">
              {isOpenEnded ? `第 ${currentPeriod + 1} 期 · 长期执行中` : `第 ${currentPeriod + 1} 期 / 共 ${plan.totalPeriods} 期`}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              dateInputRef.current?.showPicker?.()
              dateInputRef.current?.focus()
            }}
            aria-controls="operation-date-input"
            className="flex w-fit items-center gap-3 rounded-2xl border border-line/80 bg-elevated/70 px-4 py-3 text-sm text-textSoft transition hover:border-accent/20 hover:bg-elevated"
          >
            <CalendarDays size={16} className="text-textSoft" />
            <span className="text-muted">执行日期</span>
            <span className="font-mono text-white">{operationDate}</span>
            <input
              ref={dateInputRef}
              id="operation-date-input"
              type="date"
              value={operationDate}
              onChange={(event) => setOperationDate(event.target.value)}
              className="absolute opacity-0 pointer-events-none"
              tabIndex={0}
              aria-label="执行日期"
            />
          </button>
        </div>
        {latestRecord ? (
          <p className="mt-4 text-sm text-muted">上期记录日期：{latestRecord.date.slice(0, 10)}</p>
        ) : (
          <p className="mt-4 text-sm text-muted">这是你的首次执行记录。</p>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {currentAssets.map((asset, index) => {
          const isOddLastCard = currentAssets.length % 2 === 1 && index === currentAssets.length - 1
          const priceSourceLabel = asset.priceSource === 'auto' ? '自动·API' : '手动·输入'
          const priceSourcePillClass = asset.priceSource === 'auto'
            ? 'operation-status-pill operation-status-pill-auto'
            : 'operation-status-pill operation-status-pill-manual'
          const priceFeedback = asset.fetchError
            ? asset.fetchError
            : asset.priceSource === 'auto'
              ? '价格已通过接口同步，可直接确认本期执行。'
              : '当前处于手动输入模式，请确认价格后再执行。'

          return (
            <article
              key={asset.ticker}
              className={`operation-asset-card w-full p-4 sm:p-5 ${isOddLastCard ? 'xl:col-span-2 xl:max-w-[calc((100%-1rem)/2)] xl:justify-self-center' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-mono text-[1.65rem] font-semibold tracking-[0.02em] text-white">{asset.ticker}</h3>
                    <span className="operation-weight-chip">
                      {Math.round((Number(asset.weight) || 0) * 100)}%
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-[#a9bbd5]">{asset.name}</p>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="max-w-xl">
                    <p className="operation-kicker">价格输入区</p>
                    <p className="operation-helper mt-2">先确认价格来源，再录入本期执行。</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAutoFetch(asset.ticker)}
                    disabled={asset.loading}
                    className="operation-action-button w-fit shrink-0"
                  >
                    {asset.loading ? <LoaderCircle size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                    {asset.loading ? '获取中...' : '自动获取'}
                  </button>
                </div>

                <div className="operation-divider mt-5" />

                <div className="mt-6">
                  <p className="operation-kicker">当前价格</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <input
                      type="text"
                      inputMode="decimal"
                      step="0.01"
                      value={asset.price}
                      placeholder="0"
                      onChange={(event) => updateAssetState(asset.ticker, { price: normalizeNumericInput(event.target.value), priceSource: 'manual', fetchError: '' })}
                      onBlur={() => {
                        if (asset.price === '') {
                          return
                        }

                        updateAssetState(asset.ticker, {
                          price: formatNumericInput(asset.price),
                        })
                      }}
                      className="operation-field operation-price-field"
                    />
                    <span
                      aria-label={asset.priceSource === 'auto' ? '价格来源：自动获取' : '价格来源：手动输入'}
                      className={priceSourcePillClass}
                    >
                      {priceSourceLabel}
                    </span>
                  </div>
                  <p className={`mt-3 text-xs ${asset.fetchError ? 'text-amber-200' : 'text-[#94a7c3]'}`}>{priceFeedback}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="operation-metric-card p-4">
                  <p className="operation-metric-label">当前持仓价值</p>
                  <p className="operation-metric-value">{formatMoney(asset.currentValueBefore)}</p>
                </div>

                <div className="operation-metric-card p-4">
                  <p className="operation-metric-label">{plan.strategy === 'VA' ? 'VA目标值' : '本期固定投入'}</p>
                  <p className="operation-metric-value">{formatMoney(asset.targetValue)}</p>
                </div>

                <div className="operation-metric-card p-4">
                  <p className="operation-metric-label">建议买入金额</p>
                  <p className="operation-metric-value">{formatMoney(asset.requiredAmount)}</p>
                  {isOpenEnded && Number(plan.periodicTarget) === 0 ? (
                    <p className="mt-3 text-xs text-[#91a5c0]">灵活决定模式下，这里的建议值仅作为参考。</p>
                  ) : null}
                </div>

                <div className="operation-metric-card p-4">
                  <p className="operation-metric-label">建议买入股数</p>
                  <p className="operation-metric-value">{asset.suggestedSharesDisplay}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(220px,0.95fr)] sm:items-end">
                <label className="space-y-3">
                  <span className="operation-kicker">实际买入股数</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    step="0.01"
                    value={asset.actualSharesDisplay}
                    placeholder="0"
                    onChange={(event) => updateAssetState(asset.ticker, { actualShares: normalizeNumericInput(event.target.value) })}
                    onFocus={(event) => {
                      if (!asset.hasManualActualShares) {
                        event.target.select()
                      }
                    }}
                    onBlur={() => {
                      if (asset.actualSharesInput === '') {
                        return
                      }

                      updateAssetState(asset.ticker, {
                        actualShares: formatNumericInput(asset.actualSharesInput),
                      })
                    }}
                    className="operation-field operation-share-field"
                  />
                </label>

                <div className="operation-accent-card p-5">
                  <p className="operation-metric-label text-[#dbe7fb]">实际投入金额</p>
                  <p className="operation-metric-value">{formatMoney(asset.actualAmount)}</p>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <div className="card p-5">
        <p className="label">执行决策</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {decisionOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTag(option.value)}
              className={`rounded-2xl px-4 py-3 text-sm transition ${
                tag === option.value ? 'border border-accent/18 bg-accent/10 text-slate-100' : 'border border-line/80 bg-elevated/70 text-textSoft hover:border-line hover:bg-panel'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="mt-5 block space-y-2">
          <span className="text-sm text-textSoft">备注</span>
          <textarea
            rows="4"
            value={note}
            placeholder="记录你这期的判断..."
            onChange={(event) => setNote(event.target.value)}
            className="w-full rounded-2xl border border-line/80 bg-surface px-4 py-3 text-white outline-none transition focus:border-accent/35 focus:bg-elevated"
          />
        </label>

        <div className={`mt-5 grid gap-4 rounded-3xl border border-line bg-elevated p-4 ${isOpenEnded ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
          <div>
            <p className="label">本期实际投入</p>
            <p className="mt-2 font-mono text-lg text-white">{formatMoney(totalActualAmount)}</p>
          </div>
          <div>
            <p className="label">累计投入</p>
            <p className="mt-2 font-mono text-lg text-white">{formatMoney(cumulativeInvested)}</p>
          </div>
          {!isOpenEnded ? (
            <div>
              <p className="label">剩余预算</p>
              <p className="mt-2 font-mono text-lg text-white">{formatMoney(remainingBudget)}</p>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={handleConfirm}
          className="mt-5 inline-flex w-full items-center justify-center rounded-2xl border border-accent/20 bg-accent/12 px-4 py-3 font-medium text-slate-100 transition hover:border-accent/28 hover:bg-accent/16"
        >
          确认记录本期操作
        </button>
      </div>
    </section>
  )
}
