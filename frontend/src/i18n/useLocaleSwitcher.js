import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getLocaleLabel, SUPPORTED_LOCALES } from './locale-registry'
import { DEFAULT_LOCALE, isSupportedLocale, replaceLocaleInFullPath } from './utils'
import { useGlobalState } from '../store'

export const useLocaleSwitcher = () => {
    const router = useRouter()
    const route = useRoute()
    const { locale } = useI18n({ useScope: 'global' })
    const { preferredLocale } = useGlobalState()

    const languageOptions = SUPPORTED_LOCALES.map((loc) => ({
        label: getLocaleLabel(loc),
        value: loc,
        key: loc,
    }))

    const currentLocaleLabel = computed(() => {
        return languageOptions.find((opt) => opt.value === locale.value)?.label || locale.value
    })

    const changeLocale = async (lang, onSwitched) => {
        if (!isSupportedLocale(lang)) {
            return
        }

        const currentFullPath = route.fullPath
        const targetFullPath = replaceLocaleInFullPath(currentFullPath, lang)

        if (lang === locale.value && targetFullPath === currentFullPath) {
            onSwitched?.()
            return
        }

        if (lang === DEFAULT_LOCALE) {
            preferredLocale.value = DEFAULT_LOCALE
        }

        let localeSwitched = false
        try {
            await router.push({ path: targetFullPath, force: true })
            localeSwitched = router.currentRoute.value.fullPath === targetFullPath
            if (!localeSwitched) {
                await router.replace({ path: targetFullPath, force: true })
                localeSwitched = router.currentRoute.value.fullPath === targetFullPath
            }
        } catch (error) {
            console.error('Failed to switch locale', error)
        } finally {
            onSwitched?.()
        }

        if (localeSwitched) preferredLocale.value = lang
    }

    return {
        languageOptions,
        currentLocaleLabel,
        changeLocale,
    }
}
