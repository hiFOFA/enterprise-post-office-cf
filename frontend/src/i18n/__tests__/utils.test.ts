/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  INITIAL_FALLBACK_LOCALE,
  PREFERRED_LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  resolveSupportedLocale,
  matchSupportedLocale,
  getBrowserLocales,
  getStoredLocale,
  getPreferredLocale,
  getInitialLocale,
  stripLocaleFromPath,
  getPathWithLocale,
  replaceLocaleInFullPath,
} from '../utils'

describe('i18n utils', () => {
  describe('constants', () => {
    it('defines expected constants', () => {
      expect(DEFAULT_LOCALE).toBe('zh')
      expect(FALLBACK_LOCALE).toBe('zh')
      expect(INITIAL_FALLBACK_LOCALE).toBe('en')
      expect(PREFERRED_LOCALE_STORAGE_KEY).toBe('preferredLocale')
      expect(SUPPORTED_LOCALES).toEqual(['zh', 'en', 'es', 'pt-BR', 'ja', 'de'])
    })
  })

  describe('isSupportedLocale', () => {
    it('identifies supported locales correctly', () => {
      expect(isSupportedLocale('zh')).toBe(true)
      expect(isSupportedLocale('en')).toBe(true)
      expect(isSupportedLocale('es')).toBe(true)
      expect(isSupportedLocale('pt-BR')).toBe(true)
      expect(isSupportedLocale('ja')).toBe(true)
      expect(isSupportedLocale('de')).toBe(true)

      expect(isSupportedLocale('pt-br')).toBe(false) // case-sensitive for exact SupportedLocale type
      expect(isSupportedLocale('fr')).toBe(false)
      expect(isSupportedLocale('')).toBe(false)
      expect(isSupportedLocale(null)).toBe(false)
      expect(isSupportedLocale(undefined)).toBe(false)
      expect(isSupportedLocale(123)).toBe(false)
    })
  })

  describe('resolveSupportedLocale', () => {
    it('resolves case-insensitively to exact canonical locale', () => {
      expect(resolveSupportedLocale('zh')).toBe('zh')
      expect(resolveSupportedLocale('ZH')).toBe('zh')
      expect(resolveSupportedLocale('en')).toBe('en')
      expect(resolveSupportedLocale('EN')).toBe('en')
      expect(resolveSupportedLocale('pt-br')).toBe('pt-BR')
      expect(resolveSupportedLocale('PT-BR')).toBe('pt-BR')
      expect(resolveSupportedLocale('pt-BR')).toBe('pt-BR')
      expect(resolveSupportedLocale(' ja ')).toBe('ja')
      expect(resolveSupportedLocale('DE')).toBe('de')

      expect(resolveSupportedLocale('fr')).toBeNull()
      expect(resolveSupportedLocale('')).toBeNull()
      expect(resolveSupportedLocale(null)).toBeNull()
      expect(resolveSupportedLocale(undefined)).toBeNull()
    })
  })

  describe('matchSupportedLocale', () => {
    it('matches browser language tags to supported locales', () => {
      expect(matchSupportedLocale('zh')).toBe('zh')
      expect(matchSupportedLocale('zh-CN')).toBe('zh')
      expect(matchSupportedLocale('zh-TW')).toBe('zh')
      expect(matchSupportedLocale('zh-HK')).toBe('zh')

      expect(matchSupportedLocale('en')).toBe('en')
      expect(matchSupportedLocale('en-US')).toBe('en')
      expect(matchSupportedLocale('en-GB')).toBe('en')

      expect(matchSupportedLocale('es')).toBe('es')
      expect(matchSupportedLocale('es-ES')).toBe('es')
      expect(matchSupportedLocale('es-419')).toBe('es')

      expect(matchSupportedLocale('pt')).toBe('pt-BR')
      expect(matchSupportedLocale('pt-BR')).toBe('pt-BR')
      expect(matchSupportedLocale('pt-PT')).toBe('pt-BR')

      expect(matchSupportedLocale('ja')).toBe('ja')
      expect(matchSupportedLocale('ja-JP')).toBe('ja')

      expect(matchSupportedLocale('de')).toBe('de')
      expect(matchSupportedLocale('de-DE')).toBe('de')
      expect(matchSupportedLocale('de-AT')).toBe('de')

      expect(matchSupportedLocale('fr-FR')).toBeNull()
      expect(matchSupportedLocale('ko-KR')).toBeNull()
      expect(matchSupportedLocale('')).toBeNull()
      expect(matchSupportedLocale(null)).toBeNull()
    })
  })

  describe('getPreferredLocale', () => {
    it('prioritizes valid stored locale over browser locales', () => {
      expect(getPreferredLocale('de', ['en-US', 'zh-CN'])).toBe('de')
      expect(getPreferredLocale('pt-BR', ['ja'])).toBe('pt-BR')
    })

    it('matches first supported browser locale when stored locale is missing/invalid', () => {
      expect(getPreferredLocale('', ['ja-JP', 'en-US'])).toBe('ja')
      expect(getPreferredLocale(null, ['fr-FR', 'es-ES', 'en-US'])).toBe('es')
      expect(getPreferredLocale('invalid', ['de-DE'])).toBe('de')
    })

    it('falls back to INITIAL_FALLBACK_LOCALE (en) when no browser locale matches', () => {
      expect(getPreferredLocale('', ['fr-FR', 'it-IT'])).toBe('en')
      expect(getPreferredLocale(null, [])).toBe('en')
      expect(getPreferredLocale(undefined, [])).toBe('en')
    })
  })

  describe('getBrowserLocales & getStoredLocale', () => {
    const originalNavigator = globalThis.navigator
    const originalLocalStorage = globalThis.localStorage

    afterEach(() => {
      Object.defineProperty(globalThis, 'navigator', { value: originalNavigator, configurable: true })
      Object.defineProperty(globalThis, 'localStorage', { value: originalLocalStorage, configurable: true })
    })

    it('extracts browser locales correctly', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: ['zh-CN', 'en-US'], language: 'zh-CN' },
        configurable: true,
      })
      expect(getBrowserLocales()).toEqual(['zh-CN', 'en-US'])
    })

    it('falls back to single navigator.language if languages array is empty', () => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: [], language: 'ja-JP' },
        configurable: true,
      })
      expect(getBrowserLocales()).toEqual(['ja-JP'])
    })

    it('reads stored preferredLocale from localStorage', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) =>
        key === PREFERRED_LOCALE_STORAGE_KEY ? 'de' : null,
      )
      expect(getStoredLocale()).toBe('de')
      vi.restoreAllMocks()
    })

    it('returns empty string if stored locale is invalid', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('unsupported_lang')
      expect(getStoredLocale()).toBe('')
      vi.restoreAllMocks()
    })

    it('getInitialLocale resolves based on stored and browser locales', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue('es')
      Object.defineProperty(globalThis, 'navigator', {
        value: { languages: ['de-DE'], language: 'de-DE' },
        configurable: true,
      })
      expect(getInitialLocale()).toBe('es')
      vi.restoreAllMocks()
    })
  })

  describe('stripLocaleFromPath', () => {
    it('strips locale prefixes from paths', () => {
      expect(stripLocaleFromPath('/')).toBe('/')
      expect(stripLocaleFromPath('')).toBe('/')
      expect(stripLocaleFromPath('/en')).toBe('/')
      expect(stripLocaleFromPath('/en/')).toBe('/')
      expect(stripLocaleFromPath('/en/admin')).toBe('/admin')
      expect(stripLocaleFromPath('/pt-BR/login')).toBe('/login')
      expect(stripLocaleFromPath('/pt-br/login')).toBe('/login')
      expect(stripLocaleFromPath('/zh/admin')).toBe('/admin')
      expect(stripLocaleFromPath('/admin')).toBe('/admin')
      expect(stripLocaleFromPath('/login')).toBe('/login')
      expect(stripLocaleFromPath('/other/path')).toBe('/other/path')
    })
  })

  describe('getPathWithLocale', () => {
    it('generates prefix-less path for DEFAULT_LOCALE (zh)', () => {
      expect(getPathWithLocale('/', 'zh')).toBe('/')
      expect(getPathWithLocale('/login', 'zh')).toBe('/login')
      expect(getPathWithLocale('/admin', 'zh')).toBe('/admin')
      expect(getPathWithLocale('/en/login', 'zh')).toBe('/login')
    })

    it('generates prefixed path for non-default locales', () => {
      expect(getPathWithLocale('/', 'en')).toBe('/en/')
      expect(getPathWithLocale('/login', 'en')).toBe('/en/login')
      expect(getPathWithLocale('/admin', 'de')).toBe('/de/admin')
      expect(getPathWithLocale('/en/admin', 'ja')).toBe('/ja/admin')
      expect(getPathWithLocale('/pt-BR/login', 'pt-BR')).toBe('/pt-BR/login')
    })
  })

  describe('replaceLocaleInFullPath', () => {
    it('preserves query parameters and hash while changing locale', () => {
      expect(replaceLocaleInFullPath('/login?tab=admin#sec', 'en')).toBe('/en/login?tab=admin#sec')
      expect(replaceLocaleInFullPath('/en/login?tab=admin', 'zh')).toBe('/login?tab=admin')
      expect(replaceLocaleInFullPath('/en/?code=123', 'de')).toBe('/de/?code=123')
      expect(replaceLocaleInFullPath('/en?code=123', 'en')).toBe('/en/?code=123')
      expect(replaceLocaleInFullPath('/de/admin#top', 'ja')).toBe('/ja/admin#top')
      expect(replaceLocaleInFullPath('/de/admin#top', 'zh')).toBe('/admin#top')
    })
  })
})
