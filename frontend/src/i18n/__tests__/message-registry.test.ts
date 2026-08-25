import { describe, it, expect } from 'vitest'
import { MESSAGE_REGISTRY } from '../message-registry'
import { deMessages } from '../locales/source/de'
import { esMessages } from '../locales/source/es'
import { jaMessages } from '../locales/source/ja'
import { ptBRMessages } from '../locales/source/ptBR'

describe('i18n message registry audit', () => {
  const registryKeys: string[] = []
  const registryKeyDetails: Record<string, { en: string; zh: string; namespace: string; key: string }> = {}

  for (const [namespace, keys] of Object.entries(MESSAGE_REGISTRY)) {
    for (const [key, translations] of Object.entries(keys as Record<string, { en: string; zh: string }>)) {
      const fullKey = `${namespace}.${key}`
      registryKeys.push(fullKey)
      registryKeyDetails[fullKey] = {
        namespace,
        key,
        en: translations.en,
        zh: translations.zh,
      }
    }
  }

  it('1. MESSAGE_REGISTRY has no missing or empty translations in en/zh and no Chinese characters in en', () => {
    const issues: Array<{ key: string; issue: string; value: string }> = []
    const chineseRegex = /[\u4e00-\u9fff]/

    for (const [fullKey, detail] of Object.entries(registryKeyDetails)) {
      if (detail.en === undefined || detail.en === null || detail.en.trim() === '') {
        issues.push({ key: fullKey, issue: 'en is empty or undefined', value: String(detail.en) })
      }
      if (detail.zh === undefined || detail.zh === null || detail.zh.trim() === '') {
        issues.push({ key: fullKey, issue: 'zh is empty or undefined', value: String(detail.zh) })
      }
      if (detail.en && chineseRegex.test(detail.en)) {
        issues.push({ key: fullKey, issue: 'en contains Chinese characters', value: detail.en })
      }
      if (detail.en && (/\b(TODO|FIXME)\b/i.test(detail.en) || detail.en.includes('__MISSING__'))) {
        issues.push({ key: fullKey, issue: 'en contains placeholder marker (TODO/FIXME/__MISSING__)', value: detail.en })
      }
    }

    expect(issues).toEqual([])
  })

  const locales = {
    de: deMessages,
    es: esMessages,
    ja: jaMessages,
    ptBR: ptBRMessages,
  }

  it('2. Locales (de, es, ja, ptBR) have 100% key alignment with MESSAGE_REGISTRY', () => {
    const registryKeySet = new Set(registryKeys)
    const alignmentResults: Record<string, { missing: string[]; extra: string[] }> = {}

    for (const [localeName, localeObj] of Object.entries(locales)) {
      const localeKeys = Object.keys(localeObj)
      const localeKeySet = new Set(localeKeys)

      const missing = registryKeys.filter(k => !localeKeySet.has(k))
      const extra = localeKeys.filter(k => !registryKeySet.has(k))

      alignmentResults[localeName] = { missing, extra }
    }

    for (const [localeName, result] of Object.entries(alignmentResults)) {
      expect(result.missing, `Missing keys in ${localeName}`).toEqual([])
      expect(result.extra, `Extra keys in ${localeName}`).toEqual([])
    }
  })

  it('3. Parameter placeholders consistency across all languages (en, zh, de, es, ja, ptBR)', () => {
    const placeholderRegex = /\{([^{}]+)\}/g
    const extractPlaceholders = (str: string): string[] => {
      const matches: string[] = []
      let m: RegExpExecArray | null
      while ((m = placeholderRegex.exec(str)) !== null) {
        matches.push(m[1].trim())
      }
      return matches.sort()
    }

    const placeholderMismatches: Array<{
      key: string
      expected: string[]
      locale: string
      actual: string[]
      text: string
    }> = []

    for (const [fullKey, detail] of Object.entries(registryKeyDetails)) {
      const enPlaceholders = extractPlaceholders(detail.en)
      const zhPlaceholders = extractPlaceholders(detail.zh)

      if (JSON.stringify(enPlaceholders) !== JSON.stringify(zhPlaceholders)) {
        placeholderMismatches.push({
          key: fullKey,
          expected: enPlaceholders,
          locale: 'zh (vs en)',
          actual: zhPlaceholders,
          text: `en: "${detail.en}" vs zh: "${detail.zh}"`,
        })
      }

      const canonical = enPlaceholders

      for (const [localeName, localeObj] of Object.entries(locales)) {
        const text = (localeObj as Record<string, string>)[fullKey]
        if (text === undefined) continue
        const actual = extractPlaceholders(text)
        if (JSON.stringify(actual) !== JSON.stringify(canonical)) {
          placeholderMismatches.push({
            key: fullKey,
            expected: canonical,
            locale: localeName,
            actual,
            text,
          })
        }
      }
    }

    expect(placeholderMismatches).toEqual([])
  })
})
