import crypto from 'node:crypto'

export const DEFAULT_AUTH_IDLE_TIMEOUT_HOURS = 24 * 30
export const DEFAULT_AUTH_COOKIE_NAME = 'dca_tracker_session'

function normalizePositiveNumber(value, fallback) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback
}

function createSignature(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url')
}

function safeCompare(value, expected) {
  const valueBuffer = Buffer.from(String(value || ''))
  const expectedBuffer = Buffer.from(String(expected || ''))

  if (valueBuffer.length !== expectedBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(valueBuffer, expectedBuffer)
}

export function createAuthConfig(env = process.env) {
  const password = String(env.APP_PASSWORD || '')
  const enabled = password.length > 0
  const idleTimeoutHours = normalizePositiveNumber(env.AUTH_IDLE_TIMEOUT_HOURS, DEFAULT_AUTH_IDLE_TIMEOUT_HOURS)
  const secretSource = String(env.AUTH_SESSION_SECRET || password || 'dca-tracker-session')

  return {
    enabled,
    password,
    idleTimeoutHours,
    idleTimeoutMs: idleTimeoutHours * 60 * 60 * 1000,
    cookieName: String(env.AUTH_COOKIE_NAME || DEFAULT_AUTH_COOKIE_NAME),
    secret: crypto.createHash('sha256').update(`dca-tracker:${secretSource}`).digest('hex'),
  }
}

export function parseCookieHeader(header = '') {
  return String(header)
    .split(';')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .reduce((cookies, segment) => {
      const separatorIndex = segment.indexOf('=')
      if (separatorIndex <= 0) {
        return cookies
      }

      const key = segment.slice(0, separatorIndex).trim()
      const value = decodeURIComponent(segment.slice(separatorIndex + 1).trim())
      return {
        ...cookies,
        [key]: value,
      }
    }, {})
}

export function createSessionToken(config, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({
    exp: now + config.idleTimeoutMs,
  })).toString('base64url')
  const signature = createSignature(payload, config.secret)
  return `${payload}.${signature}`
}

export function validateSessionToken(token, config, now = Date.now()) {
  if (!token || !config?.enabled) {
    return {
      valid: false,
      expiresAt: 0,
    }
  }

  const [payload, signature] = String(token).split('.')
  if (!payload || !signature) {
    return {
      valid: false,
      expiresAt: 0,
    }
  }

  const expectedSignature = createSignature(payload, config.secret)
  if (!safeCompare(signature, expectedSignature)) {
    return {
      valid: false,
      expiresAt: 0,
    }
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    const expiresAt = Number(parsed?.exp) || 0

    return {
      valid: expiresAt > now,
      expiresAt,
    }
  } catch {
    return {
      valid: false,
      expiresAt: 0,
    }
  }
}

export function passwordMatches(input, expectedPassword) {
  return safeCompare(input, expectedPassword)
}

export function isSecureRequest(request) {
  const forwardedProto = String(request.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim()
    .toLowerCase()

  return Boolean(request.secure || forwardedProto === 'https')
}
