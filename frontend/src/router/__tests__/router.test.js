/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('vue-clipboard3', () => ({
  default: () => ({
    toClipboard: vi.fn(),
  }),
}))

import router from '../index'
import i18n from '../../i18n'
import { useGlobalState } from '../../store'

describe('router and beforeEach guards', () => {
  const {
    jwt, preferredLocale, adminAuth, isAdminAuthValid,
    isTelegram, openSettings, clearAdminSession,
  } = useGlobalState()

  beforeEach(async () => {
    jwt.value = ''
    preferredLocale.value = ''
    clearAdminSession()
    isTelegram.value = false
    openSettings.value.disableAdminPasswordCheck = false
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('redirects unauthenticated root visit to /login (or with detected locale)', async () => {
    // When browser is English
    Object.defineProperty(globalThis, 'navigator', {
      value: { languages: ['en-US'], language: 'en-US' },
      configurable: true,
    })

    await router.push('/')
    // Since preferredLocale will resolve to 'en'
    expect(router.currentRoute.value.path).toBe('/en/login')
    expect(i18n.global.locale.value).toBe('en')
  })

  it('keeps on / when user is logged in with jwt', async () => {
    jwt.value = 'mock-user-jwt'
    Object.defineProperty(globalThis, 'navigator', {
      value: { languages: ['zh-CN'], language: 'zh-CN' },
      configurable: true,
    })

    await router.push('/')
    expect(router.currentRoute.value.path).toBe('/')
  })

  it('redirects root to /admin if admin auth is valid', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { languages: ['zh-CN'], language: 'zh-CN' },
      configurable: true,
    })
    // Encode a valid mock admin JWT
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
    const payload = Buffer.from(JSON.stringify({
      typ: 'admin',
      role: 'main',
      username: 'admin',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })).toString('base64url')
    adminAuth.value = `${header}.${payload}.sig`

    await router.push('/login')
    await router.push('/')
    expect(router.currentRoute.value.path).toBe('/admin')
  })

  it('handles explicit language prefix like /ja/login', async () => {
    await router.push('/ja/login')
    expect(router.currentRoute.value.path).toBe('/ja/login')
    expect(i18n.global.locale.value).toBe('ja')
    expect(preferredLocale.value).toBe('ja')
  })

  it('normalizes uppercase or unnormalized language prefix like /PT-BR/login', async () => {
    await router.push('/PT-BR/login')
    expect(router.currentRoute.value.path).toBe('/pt-BR/login')
    expect(i18n.global.locale.value).toBe('pt-BR')
  })

  it('redirects /zh/* to clean URL without prefix', async () => {
    await router.push('/zh/login')
    expect(router.currentRoute.value.path).toBe('/login')
    expect(i18n.global.locale.value).toBe('zh')
  })

  it('extracts ?jwt= parameter and strips it from url', async () => {
    await router.push('/login?jwt=test-query-jwt&tab=admin')
    expect(jwt.value).toBe('test-query-jwt')
    expect(router.currentRoute.value.query.jwt).toBeUndefined()
    expect(router.currentRoute.value.query.tab).toBe('admin')
  })

  it('protects /admin route when not logged in', async () => {
    await router.push('/en/admin')
    expect(router.currentRoute.value.path).toBe('/en/login')
    expect(router.currentRoute.value.query.tab).toBe('admin')
  })

  it('allows entering /admin when disableAdminPasswordCheck is true', async () => {
    openSettings.value.disableAdminPasswordCheck = true
    await router.push('/de/admin')
    expect(router.currentRoute.value.path).toBe('/de/admin')
  })

  it('redirects /user and /user/oauth2/callback to /login', async () => {
    await router.push('/es/user')
    expect(router.currentRoute.value.path).toBe('/es/login')

    await router.push('/es/user/oauth2/callback')
    expect(router.currentRoute.value.path).toBe('/es/login')
  })
})
