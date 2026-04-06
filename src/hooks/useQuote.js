import { useCallback, useEffect, useState } from 'react'

const API_BASE_URL = 'https://api.twelvedata.com/price'
const API_KEY = import.meta.env.VITE_TWELVE_DATA_KEY

function getReadableErrorMessage(data, error) {
  if (!API_KEY) {
    return '未配置 Twelve Data API Key，请检查 .env 或部署环境变量。'
  }

  if (error?.name === 'TimeoutError') {
    return '请求超时，请稍后重试或手动输入。'
  }

  if (error instanceof TypeError) {
    return '网络异常，可能已断网或接口不可达，请手动输入。'
  }

  if (data?.code === 401 || data?.status === 'error') {
    if (String(data?.message || '').toLowerCase().includes('api key')) {
      return 'API Key 无效，请检查 Twelve Data 配置。'
    }
  }

  if (data?.code === 429 || String(data?.message || '').includes('API credits')) {
    return 'API 调用额度已用尽，请稍后再试或手动输入。'
  }

  if (String(data?.message || '').toLowerCase().includes('symbol') || String(data?.message || '').toLowerCase().includes('ticker')) {
    return 'Ticker 不存在或格式无效，请检查后重试。'
  }

  return '获取失败，请手动输入。'
}

export async function fetchQuote(ticker) {
  const symbol = String(ticker || '').trim().toUpperCase()
  if (!symbol) {
    return {
      price: null,
      error: '缺少 ticker，请手动输入价格。',
    }
  }

  if (!API_KEY) {
    return {
      price: null,
      error: '未配置 Twelve Data API Key，请检查 .env 或部署环境变量。',
    }
  }

  const url = `${API_BASE_URL}?symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    const data = await res.json()

    if (data?.price) {
      return {
        price: Number.parseFloat(data.price),
        error: '',
      }
    }

    return {
      price: null,
      error: getReadableErrorMessage(data, null),
    }
  } catch (error) {
    console.warn(`Twelve Data quote fetch failed for ${symbol}`, error)
    return {
      price: null,
      error: getReadableErrorMessage(null, error),
    }
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
