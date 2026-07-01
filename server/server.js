import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import {
  createAuthConfig,
  createSessionToken,
  isSecureRequest,
  parseCookieHeader,
  passwordMatches,
  validateSessionToken,
} from './auth.js'
import { STORAGE_KEYS, createEmptyData, loadStorageState, saveStorageState } from './storage.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const distDir = path.join(rootDir, 'dist')
const port = Number(process.env.PORT) || 3000
const app = express()
const authConfig = createAuthConfig()

const validStorageKeys = new Set(Object.values(STORAGE_KEYS))
const MAX_FAILED_LOGIN_ATTEMPTS = 5
const LOGIN_BLOCK_WINDOW_MS = 15 * 60 * 1000
const failedLoginAttempts = new Map()

function getSessionState(request) {
  if (!authConfig.enabled) {
    return {
      authRequired: false,
      authenticated: true,
      expiresAt: 0,
    }
  }

  const cookies = parseCookieHeader(request.headers.cookie)
  const session = validateSessionToken(cookies[authConfig.cookieName], authConfig)

  return {
    authRequired: true,
    authenticated: session.valid,
    expiresAt: session.expiresAt,
  }
}

function applySessionCookie(request, response) {
  if (!authConfig.enabled) {
    return
  }

  response.cookie(authConfig.cookieName, createSessionToken(authConfig), {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureRequest(request),
    maxAge: authConfig.idleTimeoutMs,
    path: '/',
  })
}

function clearSessionCookie(request, response) {
  response.clearCookie(authConfig.cookieName, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureRequest(request),
    path: '/',
  })
}

function getRequestClientId(request) {
  const forwardedFor = String(request.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim()

  return forwardedFor || request.ip || request.socket?.remoteAddress || 'unknown'
}

function getFailedLoginState(clientId, now = Date.now()) {
  const current = failedLoginAttempts.get(clientId)
  if (!current) {
    return {
      attempts: 0,
      blockedUntil: 0,
    }
  }

  if (current.blockedUntil && current.blockedUntil > now) {
    return current
  }

  if (current.windowStartedAt + LOGIN_BLOCK_WINDOW_MS <= now || (current.blockedUntil && current.blockedUntil <= now)) {
    failedLoginAttempts.delete(clientId)
    return {
      attempts: 0,
      blockedUntil: 0,
    }
  }

  return current
}

function registerFailedLogin(clientId, now = Date.now()) {
  const current = getFailedLoginState(clientId, now)
  const attempts = current.attempts + 1
  const blockedUntil = attempts >= MAX_FAILED_LOGIN_ATTEMPTS ? now + LOGIN_BLOCK_WINDOW_MS : 0

  failedLoginAttempts.set(clientId, {
    attempts,
    blockedUntil,
    windowStartedAt: current.windowStartedAt || now,
  })

  return {
    attempts,
    blockedUntil,
    remainingAttempts: Math.max(MAX_FAILED_LOGIN_ATTEMPTS - attempts, 0),
  }
}

function clearFailedLogins(clientId) {
  failedLoginAttempts.delete(clientId)
}

function requireAuth(request, response, next) {
  const sessionState = getSessionState(request)

  if (!sessionState.authRequired) {
    next()
    return
  }

  if (!sessionState.authenticated) {
    clearSessionCookie(request, response)
    response.status(401).json({
      error: 'Authentication required.',
      authRequired: true,
    })
    return
  }

  applySessionCookie(request, response)
  next()
}

function getRuntimeConfig(request, sessionState = getSessionState(request)) {
  const runtime = {
    authRequired: authConfig.enabled,
    authenticated: sessionState.authenticated,
    authIdleTimeoutHours: authConfig.idleTimeoutHours,
  }

  if (authConfig.enabled && !sessionState.authenticated) {
    return runtime
  }

  const { snapshot, meta } = loadStorageState(rootDir)

  return {
    ...runtime,
    initialData: snapshot.data,
    storageMeta: meta,
    quoteApiEnabled: Boolean(process.env.TWELVE_DATA_KEY),
  }
}

function injectRuntimeScript(html) {
  const runtimeScript = '<script src="/app-config.js"></script>'
  return html.includes(runtimeScript)
    ? html
    : html.replace('</head>', `  ${runtimeScript}\n</head>`)
}

async function fetchQuote(symbol) {
  const trimmedSymbol = String(symbol || '').trim().toUpperCase()

  if (!trimmedSymbol) {
    return {
      status: 400,
      body: { price: null, error: 'Missing ticker symbol.' },
    }
  }

  if (!process.env.TWELVE_DATA_KEY) {
    return {
      status: 400,
      body: { price: null, error: 'TWELVE_DATA_KEY is not configured on the server.' },
    }
  }

  const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(trimmedSymbol)}&apikey=${encodeURIComponent(process.env.TWELVE_DATA_KEY)}`

  try {
    const response = await fetch(url)
    const data = await response.json()
    const price = Number.parseFloat(data?.price)

    if (Number.isFinite(price)) {
      return {
        status: 200,
        body: {
          price: Number(price.toFixed(2)),
          error: '',
        },
      }
    }

    return {
      status: response.ok ? 502 : response.status,
      body: {
        price: null,
        error: data?.message || 'Quote lookup failed.',
      },
    }
  } catch (error) {
    return {
      status: 502,
      body: {
        price: null,
        error: error instanceof Error ? error.message : 'Quote lookup failed.',
      },
    }
  }
}

app.disable('x-powered-by')
app.use(express.json({ limit: '1mb' }))

app.get('/health', (_request, response) => {
  response.json({ ok: true })
})

app.get('/app-config.js', (request, response) => {
  const sessionState = getSessionState(request)

  if (sessionState.authenticated) {
    applySessionCookie(request, response)
  }

  const payload = JSON.stringify(getRuntimeConfig(request, sessionState))
  response
    .type('application/javascript')
    .send(`window.__DCA_RUNTIME__ = ${payload};`)
})

app.post('/api/auth/login', (request, response) => {
  if (!authConfig.enabled) {
    response.json({
      ok: true,
      authRequired: false,
      authenticated: true,
    })
    return
  }

  const clientId = getRequestClientId(request)
  const now = Date.now()
  const loginState = getFailedLoginState(clientId, now)

  if (loginState.blockedUntil > now) {
    response.status(429).json({
      error: '密码尝试次数过多，请稍后再试。',
      retryAfterSeconds: Math.ceil((loginState.blockedUntil - now) / 1000),
    })
    return
  }

  const password = String(request.body?.password || '')
  if (!passwordMatches(password, authConfig.password)) {
    const failure = registerFailedLogin(clientId, now)
    response.status(401).json({
      error: failure.blockedUntil > now
        ? '密码尝试次数过多，请 15 分钟后重试。'
        : '密码错误，请重试。',
      remainingAttempts: failure.remainingAttempts,
    })
    return
  }

  clearFailedLogins(clientId)
  applySessionCookie(request, response)
  response.json({
    ok: true,
    authRequired: true,
    authenticated: true,
    authIdleTimeoutHours: authConfig.idleTimeoutHours,
  })
})

app.post('/api/auth/logout', (request, response) => {
  clearSessionCookie(request, response)
  response.json({
    ok: true,
    authenticated: false,
  })
})

app.get('/api/storage/state', requireAuth, (request, response) => {
  response.json(getRuntimeConfig(request))
})

app.put('/api/storage/:key', requireAuth, (request, response) => {
  const { key } = request.params

  if (!validStorageKeys.has(key)) {
    response.status(400).json({ error: 'Unsupported storage key.' })
    return
  }

  const { snapshot } = loadStorageState(rootDir)
  const nextData = {
    ...snapshot.data,
    [key]: request.body?.value ?? null,
  }
  const saved = saveStorageState(rootDir, nextData)

  response.json({
    ok: true,
    meta: saved.meta,
  })
})

app.delete('/api/storage', requireAuth, (_request, response) => {
  const saved = saveStorageState(rootDir, createEmptyData(), {
    backupReason: 'clear',
  })

  response.json({
    ok: true,
    meta: saved.meta,
  })
})

app.get('/api/quote', requireAuth, async (request, response) => {
  const result = await fetchQuote(request.query.symbol)
  response.status(result.status).json(result.body)
})

app.use('/assets', express.static(path.join(distDir, 'assets'), { fallthrough: false }))
app.use('/favicon.ico', express.static(path.join(distDir, 'favicon.ico'), { fallthrough: true }))

app.use((request, response) => {
  if (request.path.startsWith('/api/')) {
    response.status(404).json({ error: 'Not found.' })
    return
  }

  const indexFile = path.join(distDir, 'index.html')

  if (!fs.existsSync(indexFile)) {
    response.status(500).send('dist/index.html is missing. Run "npm run build" first.')
    return
  }

  const html = fs.readFileSync(indexFile, 'utf8')
  response.type('html').send(injectRuntimeScript(html))
})

app.listen(port, () => {
  console.log(`DCA Tracker server listening on http://0.0.0.0:${port}`)
})
