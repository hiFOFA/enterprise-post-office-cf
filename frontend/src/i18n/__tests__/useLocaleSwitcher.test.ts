/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('vue-clipboard3', () => ({
  default: () => ({
    toClipboard: vi.fn(),
  }),
}))

import { createApp, defineComponent, h } from 'vue'
import { useLocaleSwitcher } from '../useLocaleSwitcher'
import router from '../../router'
import i18n from '../index'
import { useGlobalState } from '../../store'

describe('useLocaleSwitcher', () => {
  const { preferredLocale } = useGlobalState()

  beforeEach(() => {
    preferredLocale.value = ''
    window.localStorage.clear()
  })

  it('provides language options with all supported locales', () => {
    let switcher: ReturnType<typeof useLocaleSwitcher> | null = null

    const Comp = defineComponent({
      setup() {
        switcher = useLocaleSwitcher()
        return () => h('div')
      },
    })

    const app = createApp(Comp)
    app.use(router)
    app.use(i18n)
    const el = document.createElement('div')
    app.mount(el)

    expect(switcher).not.toBeNull()
    expect(switcher!.languageOptions.map(o => o.value)).toEqual(['zh', 'en', 'es', 'pt-BR', 'ja', 'de'])
    app.unmount()
  })

  it('switches locale and pushes route correctly', async () => {
    let switcher: ReturnType<typeof useLocaleSwitcher> | null = null

    const Comp = defineComponent({
      setup() {
        switcher = useLocaleSwitcher()
        return () => h('div')
      },
    })

    const app = createApp(Comp)
    app.use(router)
    app.use(i18n)
    const el = document.createElement('div')
    app.mount(el)

    await router.push('/login')
    const callback = vi.fn()
    await switcher!.changeLocale('ja', callback)

    expect(callback).toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/ja/login')
    expect(preferredLocale.value).toBe('ja')

    // Switch back to zh (default locale)
    await switcher!.changeLocale('zh')
    expect(router.currentRoute.value.path).toBe('/login')
    expect(preferredLocale.value).toBe('zh')

    app.unmount()
  })

  it('ignores unsupported locales gracefully', async () => {
    let switcher: ReturnType<typeof useLocaleSwitcher> | null = null

    const Comp = defineComponent({
      setup() {
        switcher = useLocaleSwitcher()
        return () => h('div')
      },
    })

    const app = createApp(Comp)
    app.use(router)
    app.use(i18n)
    const el = document.createElement('div')
    app.mount(el)

    await router.push('/login')
    await switcher!.changeLocale('fr')
    expect(router.currentRoute.value.path).toBe('/login')

    app.unmount()
  })
})
