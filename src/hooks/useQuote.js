import { useCallback, useEffect, useState } from 'react'
import { getRuntimeInfo } from '../utils/storage'

const QUOTE_API_PATH = '/api/quote'

function roundQuotePrice(value) {
  const numeric = Number.parseFloat(value)
  return Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : null
}

function getRuntimeConfig() {
  return getRuntimeInfo()
}

function getReadableErrorMessage(data, error) {
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
    return '请求超时，请稍后重试或手动输入。'
  }

  if (error instanceof SyntaxError) {
    return '行情服务返回了无效响应，请检查容器日志。'
  }

  if (error instanceof TypeError) {
    return '自动行情服务不可用，请确认 Docker 容器已启动，或先手动输入价格。'
  }

  const message = String(data?.error || data?.message || '')
  const lowerMessage = message.toLowerCase()

  if (lowerMessage.includes('twelve_data_key') || lowerMessage.includes('api key')) {
    return '服务端未配置有效的 Twelve Data API Key，请在 Docker 环境变量中设置 `TWELVE_DATA_KEY`。'
  }

  if (data?.code === 429 || lowerMessage.includes('api credits')) {
    return 'API 调用额度已用尽，请稍后再试或手动输入。'
  }

  if (lowerMessage.includes('symbol') || lowerMessage.includes('ticker')) {
    return 'Ticker 不存在或格式无效，请检查后重试。'
  }

  return message || '获取失败，请手动输入。'
}

function createTimeoutSignal(timeoutMs = 5000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  return {
    signal: controller.signal,
    clear: () => clearTimeout(timeoutId),
  }
}

async function parseJsonResponse(response) {
  const text = await response.text()
  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new SyntaxError('Invalid JSON response')
  }
}

export async function fetchQuote(ticker) {
  const symbol = String(ticker || '').trim().toUpperCase()
  if (!symbol) {
    return {
      price: null,
      error: '缺少 ticker，请手动输入价格。',
    }
  }

  const runtime = getRuntimeConfig()
  if (runtime?.quoteApiEnabled === false) {
    return {
      price: null,
      error: '服务端尚未配置 Twelve Data API Key，请在 Docker 环境变量中设置 `TWELVE_DATA_KEY`。',
    }
  }

  const url = `${QUOTE_API_PATH}?symbol=${encodeURIComponent(symbol)}`

  let timeout
  try {
    timeout = createTimeoutSignal()
    const res = await fetch(url, { signal: timeout.signal })

    if (res.status === 401 && typeof window !== 'undefined') {
      window.location.reload()
      return {
        price: null,
        error: '登录已过期，请重新验证。',
      }
    }

    const data = await parseJsonResponse(res)
    const roundedPrice = roundQuotePrice(data?.price)

    if (roundedPrice !== null) {
      return {
        price: roundedPrice,
        error: '',
      }
    }

    return {
      price: null,
      error: getReadableErrorMessage(data, res.ok ? null : new Error('Quote lookup failed')),
    }
  } catch (error) {
    console.warn(`Twelve Data quote fetch failed for ${symbol}`, error)
    return {
      price: null,
      error: getReadableErrorMessage(null, error),
    }
  } finally {
    timeout?.clear()
  }
}

export function useQuote(symbol, manualPrice) {
  const [state, setState] = useState({
    price: Number(manualPrice) || 0,
    source: manualPrice ? 'manual' : 'idle',
    error: '',
    loading: false,
  })

  const refreshQuote = useCallback(async () => {
    if (!symbol) {
      setState({
        price: Number(manualPrice) || 0,
        source: 'manual',
        error: '缺少 ticker，请手动输入价格。',
        loading: false,
      })
      return null
    }

    setState((current) => ({
      ...current,
      loading: true,
      error: '',
    }))

    const result = await fetchQuote(symbol)

    if (typeof result.price === 'number') {
      setState({
        price: result.price,
        source: 'auto',
        error: '',
        loading: false,
      })
      return result.price
    }

    setState({
      price: Number(manualPrice) || 0,
      source: 'manual',
      error: result.error || '获取失败，请手动输入。',
      loading: false,
    })
    return null
  }, [manualPrice, symbol])

  useEffect(() => {
    let active = true

    async function run() {
      if (!symbol) {
        setState({
          price: Number(manualPrice) || 0,
          source: 'manual',
          error: '缺少 ticker，请手动输入价格。',
          loading: false,
        })
        return
      }

      setState((current) => ({
        ...current,
        loading: true,
      }))

      const result = await fetchQuote(symbol)
      if (!active) return

      if (typeof result.price === 'number') {
        setState({
          price: result.price,
          source: 'auto',
          error: '',
          loading: false,
        })
        return
      }

      setState({
        price: Number(manualPrice) || 0,
        source: 'manual',
        error: result.error || '获取失败，请手动输入。',
        loading: false,
      })
    }

    run()

    return () => {
      active = false
    }
  }, [manualPrice, symbol])

  return {
    ...state,
    refreshQuote,
  }
}
