<script setup>
import { computed } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { useScopedI18n } from '@/i18n/app'

const props = defineProps({
    role: {
        type: String,
        default: 'personal',
    },
})

const { t } = useScopedI18n('components.UsageGuide')
const dismissedPersonal = useLocalStorage('usageGuideDismissedPersonal', false)
const dismissedAdmin = useLocalStorage('usageGuideDismissedAdmin', false)

const visible = computed(() => {
    if (props.role === 'admin') return !dismissedAdmin.value
    return !dismissedPersonal.value
})

const steps = computed(() => {
    if (props.role === 'admin') {
        return [t('adminStep1'), t('adminStep2'), t('adminStep3')]
    }
    return [t('personalStep1'), t('personalStep2'), t('personalStep3')]
})

const dismiss = () => {
    if (props.role === 'admin') {
        dismissedAdmin.value = true
        return
    }
    dismissedPersonal.value = true
}
</script>

<template>
    <n-alert v-if="visible" type="info" :show-icon="false" :bordered="false" closable @close="dismiss"
        style="margin: 10px 0; text-align: left;">
        <div style="font-weight: 600; margin-bottom: 6px;">{{ t('title') }}</div>
        <ol style="margin: 0; padding-left: 18px;">
            <li v-for="(step, index) in steps" :key="index">{{ step }}</li>
        </ol>
    </n-alert>
</template>
