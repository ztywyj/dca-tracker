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
import { getRemainingDeployableBudget } from '../utils/budget'
import { getNextSuggestedOperationDate } from '../utils/schedule'

const decisionOptions = [
  { value: 'normal', label: '正常执行' },
  { value: 'underweight', label: '主动低配' },
  { value: 'paused', label: '本期暂停' },
  { value: 'rebalance', label: '再平衡' },
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

function formatPriceDisplay(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric.toFixed(2) : ''
}

function getDecisionButtonClass(active) {
  return active ? 'filter-chip filter-chip-active justify-center' : 'filter-chip justify-center'
}

function isRebalanceTag(value) {
  return value === 'rebalance'
}

function getLatestRecordedAssetPriceMap(planId, records = []) {
  const latestRecord = (Array.isArray(records) ? records : [])
    .filter((record) => record.planId === planId)
    .slice()
    .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')))[0]

  return Object.fromEntries((latestRecord?.assets || []).map((asset) => [asset.ticker, Number(asset.price) || 0]))
}

export function getActualSharesForDecision({ tag, hasManualActualShares, actualSharesInput, suggestedShares }) {
  if (tag === 'paused') {
    return 0
  }

  return hasManualActualShares ? roundToTwo(toNumberOrFallback(actualSharesInput, 0)) : roundToTwo(suggestedShares)
}

export default function OperationPanel({ plan, records, onSaveRecord, onNavigate }) {
  const [operationDate, setOperationDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [tag, setTag] = useState('normal')
  const [note, setNote] = useState('')
  const [assetStates, setAssetStates] = useState([])
  const dateInputRef = useRef(null)

  const targetMatrix = useMemo(() => (plan ? calcAllTargets(plan) : []), [plan])
  const isOpenEnded = plan?.budgetMode === 'open-ended'
  const latestRecordedAssetPriceMap = useMemo(
    () => (plan ? getLatestRecordedAssetPriceMap(plan.id, records) : {}),
    [plan, records],
  )

  useEffect(() => {
    if (!plan?.assets?.length) {
      setAssetStates([])
      return
    }

    setAssetStates(
      plan.assets.map((asset) => ({
        ticker: asset.ticker,
        price: '',
        priceSource: 'manual',
        loading: false,
        actualShares: null,
        fetchError: '',
      })),
    )
  }, [plan])

  if (!plan) {
    return (
      <section className="section-shell">
        <div className="section-card text-center text-textSoft">
          请先创建计划，再进入本期操作页。
        </div>
      </section>
    )
  }

  const rawCurrentPeriod = Math.max(Number(plan.currentPeriod) || 0, 0)
  const totalPeriods = Math.max(1, Number(plan.totalPeriods) || 1)
  const isPlanComplete = !isOpenEnded && rawCurrentPeriod >= totalPeriods
  const currentPeriod = isOpenEnded
    ? rawCurrentPeriod
    : Math.min(rawCurrentPeriod, totalPeriods - 1)
  const latestRecord = records.find((record) => record.planId === plan.id && record.periodIndex === rawCurrentPeriod - 1)
  const suggestedNextDate = getNextSuggestedOperationDate(plan, records)

  const currentAssets = plan.assets.map((asset, index) => {
    const state = assetStates.find((item) => item.ticker === asset.ticker) || {
      ticker: asset.ticker,
      price: '',
      priceSource: 'manual',
      loading: false,
      actualShares: null,
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
    const shareSuggestionOptions = {
      strategy: plan.shareRoundingStrategy,
      referencePrice: latestRecordedAssetPriceMap[asset.ticker] || 0,
    }
    const suggestedShares = plan.strategy === 'VA'
      ? getVaSuggestedShares(requiredAmount, price, shareSuggestionOptions)
      : getDcaSuggestedShares(requiredAmount, price, shareSuggestionOptions)
    const hasManualActualShares = state.actualShares !== null && state.actualShares !== undefined
    const actualShares = getActualSharesForDecision({
      tag,
      hasManualActualShares,
      actualSharesInput: state.actualShares,
      suggestedShares,
    })
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
      actualSharesDisplay: tag === 'paused'
        ? '0'
        : hasManualActualShares
          ? state.actualShares
          : formatNumericInput(suggestedShares),
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
  const remainingBudget = getRemainingDeployableBudget(plan, cumulativeInvested)
  const pricingReadyCount = currentAssets.filter((asset) => !asset.loading && toNumberOrFallback(asset.price, 0) > 0).length
  const isReadyToConfirm = !isPlanComplete && currentAssets.length > 0 && currentAssets.every((asset) => !asset.loading && toNumberOrFallback(asset.price, 0) > 0)

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
        price: formatPriceDisplay(result.price),
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
    if (!isReadyToConfirm) {
      return
    }

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
      currentPeriod: isRebalanceTag(tag) ? (Number(plan.currentPeriod) || 0) : (Number(plan.currentPeriod) || 0) + 1,
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
    <section className="section-shell">
      <div className="section-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="label">Execution Workspace</p>
            <h2 className="section-title">
              {isOpenEnded
                ? `第 ${currentPeriod + 1} 期 · 长期执行中`
                : isPlanComplete
                  ? `已完成 ${totalPeriods} / ${totalPeriods} 期`
                  : `第 ${currentPeriod + 1} 期 / 共 ${totalPeriods} 期`}
            </h2>
            <p className="muted-copy mt-3 max-w-2xl">
              先确认价格来源，再写入实际股数。页面会用统一的控制台视图展示目标、建议与最终执行金额。
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              dateInputRef.current?.showPicker?.()
              dateInputRef.current?.focus()
            }}
            aria-controls="operation-date-input"
            className="relative control-button"
          >
            <CalendarDays size={16} />
            <span className="text-muted-foreground">执行日期</span>
            <span className="data-value">{operationDate}</span>
            <input
              ref={dateInputRef}
              id="operation-date-input"
              type="date"
              value={operationDate}
              onChange={(event) => setOperationDate(event.target.value)}
              className="pointer-events-none absolute opacity-0"
              tabIndex={-1}
              aria-label="执行日期"
            />
          </button>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-5">
          <div className="surface-stat">
            <p className="mini-kicker">计划策略</p>
            <p className="mt-3 text-base font-medium text-white">{plan.strategy}</p>
            <p className="mt-2 text-xs text-muted-foreground">{plan.frequency === 'biweekly' ? '双周执行' : '月度执行'}</p>
          </div>
          <div className="surface-stat">
            <p className="mini-kicker">上期记录</p>
            <p className="mt-3 data-value text-xl">{latestRecord ? String(latestRecord.date).slice(0, 10) : '--'}</p>
            <p className="mt-2 text-xs text-muted-foreground">{latestRecord ? '已有上一期参考' : '这是首次执行记录'}</p>
          </div>
          <div className="surface-stat">
            <p className="mini-kicker">标的数量</p>
            <p className="mt-3 data-value text-xl">{plan.assets.length}</p>
            <p className="mt-2 text-xs text-muted-foreground">已录入价格 {pricingReadyCount}/{plan.assets.length}</p>
          </div>
          <div className="surface-stat">
            <p className="mini-kicker">建议下次定投</p>
            <p className="mt-3 data-value text-xl operation-next-date-value">{suggestedNextDate || '--'}</p>
            <p className="mt-2 text-xs text-muted-foreground">{latestRecord ? '按上一期频率顺延' : '暂无记录，建议从今天开始'}</p>
          </div>
          <div className="surface-stat">
            <p className="mini-kicker">{isOpenEnded ? '本期目标' : '预算模式'}</p>
            <p className={`mt-3 text-xl ${isOpenEnded ? 'data-value' : 'font-sans font-medium text-white'}`}>
              {isOpenEnded ? formatMoney(plan.periodicTarget) : '固定预算'}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{isOpenEnded ? '目标投入参考值' : '按总预算推进'}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {currentAssets.map((asset, index) => {
          const isOddLastCard = currentAssets.length % 2 === 1 && index === currentAssets.length - 1

          return (
            <article
              key={asset.ticker}
              className={`operation-asset-card w-full p-5 ${isOddLastCard ? 'xl:col-span-2 xl:max-w-[calc((100%-1.25rem)/2)] xl:justify-self-center' : ''}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="data-value text-[1.5rem] font-semibold tracking-[-0.03em]">{asset.ticker}</h3>
                    <span className="operation-weight-chip">{Math.round((Number(asset.weight) || 0) * 100)}%</span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{asset.name}</p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 xl:grid-cols-2">
                <div className="subtle-panel flex h-full flex-col p-4">
                  <p className="mini-kicker">价格输入</p>
                  <div className="mt-4 flex-1">
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
                          price: formatPriceDisplay(asset.price),
                        })
                      }}
                      className="operation-field operation-price-field financial-input"
                    />
                  </div>
                  <div className="mt-4 subtle-row operation-footer-row operation-manual-row">
                    <span className="text-sm text-muted-foreground">可手动输入</span>
                    <button
                      type="button"
                      onClick={() => handleAutoFetch(asset.ticker)}
                      disabled={asset.loading}
                      className="operation-action-button"
                    >
                      {asset.loading ? <LoaderCircle size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                      {asset.loading ? '获取中...' : '自动获取价格'}
                    </button>
                  </div>
                  {asset.fetchError ? (
                    <p className="mt-3 text-xs leading-5 text-negative">{asset.fetchError}</p>
                  ) : null}
                </div>

                <div className="subtle-panel flex h-full flex-col p-4">
                  <p className="mini-kicker">实际执行股数</p>
                  <div className="mt-4 flex-1">
                    <input
                      type="text"
                      inputMode="text"
                      step="0.01"
                      value={asset.actualSharesDisplay}
                      placeholder="0"
                      onChange={(event) => updateAssetState(asset.ticker, { actualShares: normalizeNumericInput(event.target.value, { allowNegative: true }) })}
                      onFocus={(event) => {
                        if (!asset.hasManualActualShares) {
                          event.target.select()
                        }
                      }}
                      onBlur={() => {
                        if (asset.actualSharesInput === null || asset.actualSharesInput === undefined || asset.actualSharesInput === '') {
                          return
                        }

                        updateAssetState(asset.ticker, {
                          actualShares: formatNumericInput(asset.actualSharesInput, { allowNegative: true }),
                        })
                      }}
                      className="operation-field operation-share-field financial-input"
                    />
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">支持负数，卖出或减仓时可直接输入负股数。</p>
                  <div className="mt-4 subtle-row operation-footer-row">
                    <span className="operation-footer-label">实际变动金额</span>
                    <span className="operation-footer-value">{formatMoney(asset.actualAmount)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-5">
                <div className="operation-metric-card p-4">
                  <p className="operation-metric-label">当前持仓价值</p>
                  <p className="operation-metric-value">{formatMoney(asset.currentValueBefore)}</p>
                </div>

                <div className="operation-metric-card p-4">
                  <p className="operation-metric-label">{plan.strategy === 'VA' ? 'VA 目标值' : '本期固定投入'}</p>
                  <p className="operation-metric-value">{formatMoney(asset.targetValue)}</p>
                </div>

                <div className="operation-metric-card p-4">
                  <p className="operation-metric-label">建议买入金额</p>
                  <p className="operation-metric-value">{formatMoney(asset.requiredAmount)}</p>
                  {isOpenEnded && Number(plan.periodicTarget) === 0 ? (
                    <p className="mt-3 text-xs text-muted-foreground">灵活决定模式下，这里的建议值仅作为参考。</p>
                  ) : null}
                </div>

                <div className="operation-accent-card p-4">
                  <p className="operation-metric-label">建议买入股数</p>
                  <p className="operation-metric-value">{asset.suggestedSharesDisplay}</p>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <div className="section-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="label">Decision & Commit</p>
            <h3 className="section-title">确认本期执行</h3>
            <p className="muted-copy mt-3">先标记本期执行决策，再补充备注，最后把整期记录写入历史。选择“再平衡”时只会更新仓位，不推进下一期 VA 节奏。</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          {decisionOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTag(option.value)}
              className={getDecisionButtonClass(tag === option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <label className="mt-5 block space-y-2">
          <span className="text-sm text-muted-foreground">备注</span>
          <textarea
            rows="4"
            value={note}
            placeholder="记录你这期的判断..."
            onChange={(event) => setNote(event.target.value)}
            className="surface-textarea"
          />
        </label>

        <div className={`mt-5 grid gap-3 ${isOpenEnded ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
          <div className="surface-stat">
            <p className="mini-kicker">本期实际投入</p>
            <p className="mt-3 data-value text-xl">{formatMoney(totalActualAmount)}</p>
          </div>
          <div className="surface-stat">
            <p className="mini-kicker">累计投入</p>
            <p className="mt-3 data-value text-xl">{formatMoney(cumulativeInvested)}</p>
          </div>
          {!isOpenEnded ? (
            <div className="surface-stat">
              <p className="mini-kicker">剩余可投</p>
              <p className="mt-3 data-value text-xl">{formatMoney(remainingBudget)}</p>
            </div>
          ) : null}
        </div>

        {isPlanComplete ? (
          <p className="mt-4 text-sm text-muted-foreground">
            固定期数计划已完成。如需继续执行，请先到设置页增加总期数或填写新计划。
          </p>
        ) : !isReadyToConfirm ? (
          <p className="mt-4 text-sm text-muted-foreground">
            先为全部标的填入价格，并等待自动获取完成后，再确认写入历史。
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!isReadyToConfirm}
          className="control-button-primary mt-5 w-full"
        >
          确认记录本期操作
        </button>
      </div>
    </section>
  )
}
