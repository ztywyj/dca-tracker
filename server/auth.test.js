import { describe, expect, it } from 'vitest'
import {
  createAuthConfig,
  createSessionToken,
  parseCookieHeader,
  passwordMatches,
  validateSessionToken,
} from './auth.js'

describe('auth helpers', () => {
  it('creates and validates a signed session token', () => {
    const config = createAuthConfig({
      APP_PASSWORD: 'super-secret',
      AUTH_SESSION_SECRET: 'another-secret',
      AUTH_IDLE_TIMEOUT_HOURS: '1',
    })

    const token = createSessionToken(config, 1_000)

    expect(validateSessionToken(token, config, 2_000)).toEqual({
      valid: true,
      expiresAt: 3_601_000,
    })
    expect(validateSessionToken(token, config, 3_601_001).valid).toBe(false)
  })

  it('parses cookies and compares passwords safely', () => {
    expect(parseCookieHeader('foo=bar; session=token-value')).toEqual({
      foo: 'bar',
      session: 'token-value',
    })
    expect(passwordMatches('abc123', 'abc123')).toBe(true)
    expect(passwordMatches('abc123', 'abc124')).toBe(false)
  })
})
