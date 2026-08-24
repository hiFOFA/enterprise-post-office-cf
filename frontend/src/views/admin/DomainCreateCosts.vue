<script setup>
import { computed, onMounted, ref } from 'vue'
import { useScopedI18n } from '@/i18n/app'

import { useGlobalState } from '../../store'
import { api } from '../../api'

const { loading, openSettings } = useGlobalState()
const message = useMessage()
const { t } = useScopedI18n('views.admin.DomainCreateCosts')

const costs = ref({})
const DEFAULT_COST = 1

const parseCosts = (raw) => {
    if (!raw || typeof raw !== 'object') return {}
    if (raw.costs && typeof raw.costs === 'object' && !Array.isArray(raw.costs)) {
        return { ...raw.costs }
    }
    if (raw.domain_create_costs && typeof raw.domain_create_costs === 'object') {
        return { ...raw.domain_create_costs }
    }
    const skip = new Set(['success', 'default', 'fetched'])
    const next = {}
    for (const [key, value] of Object.entries(raw)) {
        if (skip.has(key)) continue
        if (typeof value === 'number') next[key] = value
    }
    return next
}

const rows = computed(() => {
    const domains = openSettings.value.domains || []
    return domains.map((item) => {
        const domain = item.value || item.label
        const value = costs.value[domain]
        return {
            domain,
            cost: Number.isFinite(Number(value)) ? Number(value) : DEFAULT_COST,
        }
    })
})

const fetchData = async () => {
    try {
        const raw = await api.fetch('/admin/domain_create_costs')
        costs.value = parseCosts(raw)
    } catch (error) {
        message.error(error.message || 'error')
    }
}

const updateCost = (domain, value) => {
    const next = Number(value)
    costs.value = {
        ...costs.value,
        [domain]: Number.isFinite(next) && next >= 0 ? next : DEFAULT_COST,
    }
}

const save = async () => {
    const payload = {}
    for (const row of rows.value) {
        payload[row.domain] = row.cost
    }
    try {
        await api.fetch('/admin/domain_create_costs', {
            method: 'POST',
            body: JSON.stringify({
                costs: payload,
                domain_create_costs: payload,
            }),
        })
        message.success(t('success'))
        await fetchData()
    } catch (error) {
        message.error(error.message || 'error')
    }
}

onMounted(async () => {
    if (!openSettings.value.fetched) {
        await api.getOpenSettings(message)
    }
    await fetchData()
})
</script>

<template>
    <div class="center">
        <n-card :bordered="false" embedded style="max-width: 720px; width: 100%;">
            <n-alert type="info" :show-icon="false" :bordered="false" style="margin-bottom: 12px;">
                {{ t('tip') }}
            </n-alert>
            <n-space vertical>
                <n-form-item v-for="row in rows" :key="row.domain" :label="row.domain">
                    <n-input-number :min="0" :value="row.cost" style="width: 100%;"
                        @update:value="(val) => updateCost(row.domain, val)" />
                </n-form-item>
                <n-empty v-if="rows.length === 0" :description="t('noDomains')" />
                <n-button type="primary" block :loading="loading" @click="save">
                    {{ t('save') }}
                </n-button>
            </n-space>
        </n-card>
    </div>
</template>

<style scoped>
.center {
    display: flex;
    justify-content: center;
    margin: 20px;
}
</style>
