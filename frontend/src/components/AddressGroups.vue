<script setup>
import { computed, h, onMounted, ref } from 'vue'
import { NButton } from 'naive-ui'
import { useScopedI18n } from '@/i18n/app'

import { useGlobalState } from '../store'
import { api } from '../api'
import { displayAddressName } from '../utils/addressDisplay'

const props = defineProps({
    apiPrefix: { type: String, required: true },
    showLimits: { type: Boolean, default: false },
    localAddresses: { type: Array, default: null },
})

const { loading } = useGlobalState()
const message = useMessage()
const { t } = useScopedI18n('views.admin.AddressGroups')

const groups = ref([])
const limits = ref({ sub: 10, user: 10 })
const maxGroups = ref(null)
const usedGroups = ref(0)
const newName = ref('')
const selectedGroup = ref(null)
const members = ref([])
const addIds = ref([])
const addressOptions = ref([])
const addressQuery = ref('')
const showMembers = ref(false)
const showRename = ref(false)
const showDelete = ref(false)
const renameName = ref('')

const usedLabel = computed(() => {
    if (maxGroups.value == null) return t('unlimitedUsed', { used: usedGroups.value })
    return t('usedOfMax', { used: usedGroups.value, max: maxGroups.value })
})

const parseGroups = (raw) => {
    if (Array.isArray(raw)) return raw
    if (Array.isArray(raw?.results)) return raw.results
    return []
}

const fetchGroups = async () => {
    try {
        const raw = await api.fetch(`${props.apiPrefix}/address_groups`)
        groups.value = parseGroups(raw)
        if (raw?.limits) limits.value = raw.limits
        maxGroups.value = raw?.max ?? null
        usedGroups.value = raw?.used ?? groups.value.length
    } catch (error) {
        message.error(error.message || 'error')
    }
}

const fetchMembers = async (group) => {
    const raw = await api.fetch(`${props.apiPrefix}/address_groups/${group.id}/members`)
    members.value = parseGroups(raw)
}

const loadAddressOptions = async () => {
    if (Array.isArray(props.localAddresses)) {
        addressOptions.value = props.localAddresses
            .filter((item) => item?.id)
            .map((item) => ({
                label: displayAddressName(item.note, item.name || item.address),
                value: item.id,
            }))
        return
    }
    try {
        const query = addressQuery.value.trim()
        const raw = await api.fetch(
            `/admin/address?limit=50&offset=0${query ? `&query=${encodeURIComponent(query)}` : ''}`
        )
        addressOptions.value = (raw.results || []).map((row) => ({
            label: displayAddressName(row.note, row.name),
            value: row.id,
        }))
    } catch (error) {
        message.error(error.message || 'error')
    }
}

const createGroup = async () => {
    const name = newName.value.trim()
    if (!name) {
        message.error(t('nameRequired'))
        return
    }
    try {
        await api.fetch(`${props.apiPrefix}/address_groups`, {
            method: 'POST',
            body: JSON.stringify({ name }),
        })
        newName.value = ''
        message.success(t('success'))
        await fetchGroups()
    } catch (error) {
        message.error(error.message || 'error')
    }
}

const openMembers = async (row) => {
    selectedGroup.value = row
    addIds.value = []
    addressQuery.value = ''
    showMembers.value = true
    try {
        await Promise.all([fetchMembers(row), loadAddressOptions()])
    } catch (error) {
        message.error(error.message || 'error')
    }
}

const addMembers = async () => {
    if (!selectedGroup.value || addIds.value.length === 0) return
    try {
        await api.fetch(`${props.apiPrefix}/address_groups/${selectedGroup.value.id}/members`, {
            method: 'POST',
            body: JSON.stringify({ address_ids: addIds.value }),
        })
        addIds.value = []
        message.success(t('success'))
        await fetchMembers(selectedGroup.value)
        await fetchGroups()
    } catch (error) {
        message.error(error.message || 'error')
    }
}

const removeMember = async (addressId) => {
    if (!selectedGroup.value) return
    try {
        await api.fetch(`${props.apiPrefix}/address_groups/${selectedGroup.value.id}/members`, {
            method: 'DELETE',
            body: JSON.stringify({ address_ids: [addressId] }),
        })
        await fetchMembers(selectedGroup.value)
        await fetchGroups()
    } catch (error) {
        message.error(error.message || 'error')
    }
}

const openRename = (row) => {
    selectedGroup.value = row
    renameName.value = row.name
    showRename.value = true
}

const renameGroup = async () => {
    if (!selectedGroup.value) return
    const name = renameName.value.trim()
    if (!name) {
        message.error(t('nameRequired'))
        return
    }
    try {
        await api.fetch(`${props.apiPrefix}/address_groups/${selectedGroup.value.id}`, {
            method: 'POST',
            body: JSON.stringify({ name }),
        })
        message.success(t('success'))
        showRename.value = false
        await fetchGroups()
    } catch (error) {
        message.error(error.message || 'error')
    }
}

const openDelete = (row) => {
    selectedGroup.value = row
    showDelete.value = true
}

const deleteGroup = async () => {
    if (!selectedGroup.value) return
    try {
        await api.fetch(`${props.apiPrefix}/address_groups/${selectedGroup.value.id}`, {
            method: 'DELETE',
        })
        message.success(t('success'))
        showDelete.value = false
        await fetchGroups()
    } catch (error) {
        message.error(error.message || 'error')
    }
}

const saveLimits = async () => {
    try {
        await api.fetch('/admin/group_limits', {
            method: 'POST',
            body: JSON.stringify({
                sub: Number(limits.value.sub),
                user: Number(limits.value.user),
            }),
        })
        message.success(t('success'))
        await fetchGroups()
    } catch (error) {
        message.error(error.message || 'error')
    }
}

const columns = computed(() => [
    { title: 'ID', key: 'id', width: 72, minWidth: 72 },
    { title: t('name'), key: 'name' },
    { title: t('memberCount'), key: 'member_count' },
    { title: t('created_at'), key: 'created_at' },
    {
        title: t('actions'),
        key: 'actions',
        minWidth: 260,
        render(row) {
            return h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, [
                h(NButton, {
                    size: 'small',
                    tertiary: true,
                    type: 'primary',
                    onClick: () => openMembers(row),
                }, { default: () => t('members') }),
                h(NButton, {
                    size: 'small',
                    tertiary: true,
                    onClick: () => openRename(row),
                }, { default: () => t('rename') }),
                h(NButton, {
                    size: 'small',
                    tertiary: true,
                    type: 'error',
                    onClick: () => openDelete(row),
                }, { default: () => t('delete') }),
            ])
        },
    },
])

onMounted(fetchGroups)
</script>

<template>
    <div style="margin-top: 10px;">
        <n-alert type="info" :show-icon="false" :bordered="false" style="margin-bottom: 12px;">
            {{ t('tip') }} {{ usedLabel }}
        </n-alert>

        <n-card v-if="showLimits" :bordered="false" embedded style="margin-bottom: 12px;">
            <n-space align="end">
                <n-form-item :label="t('subLimit')" style="margin-bottom: 0;">
                    <n-input-number v-model:value="limits.sub" :min="0" :max="999" />
                </n-form-item>
                <n-form-item :label="t('userLimit')" style="margin-bottom: 0;">
                    <n-input-number v-model:value="limits.user" :min="0" :max="999" />
                </n-form-item>
                <n-button type="primary" tertiary :loading="loading" @click="saveLimits">
                    {{ t('saveLimits') }}
                </n-button>
            </n-space>
            <n-text depth="3">{{ t('limitsTip') }}</n-text>
        </n-card>

        <n-input-group style="margin-bottom: 12px;">
            <n-input v-model:value="newName" :placeholder="t('namePlaceholder')" @keydown.enter="createGroup" />
            <n-button type="primary" :loading="loading" @click="createGroup">{{ t('create') }}</n-button>
        </n-input-group>

        <n-data-table :columns="columns" :data="groups" :bordered="false" :single-line="false" embedded />

        <n-modal v-model:show="showMembers" preset="dialog" :title="t('members')" style="width: 640px;">
            <n-space vertical>
                <n-input-group v-if="!localAddresses">
                    <n-input v-model:value="addressQuery" :placeholder="t('searchAddress')"
                        @keydown.enter="loadAddressOptions" />
                    <n-button tertiary @click="loadAddressOptions">{{ t('query') }}</n-button>
                </n-input-group>
                <n-select v-model:value="addIds" multiple filterable :options="addressOptions"
                    :placeholder="t('addMember')" />
                <n-button type="primary" tertiary :disabled="addIds.length === 0" @click="addMembers">
                    {{ t('addMember') }}
                </n-button>
                <n-empty v-if="members.length === 0" :description="t('emptyMembers')" />
                <n-list v-else>
                    <n-list-item v-for="row in members" :key="row.id">
                        <n-space justify="space-between" style="width: 100%;">
                            <span>{{ displayAddressName(row.note, row.name) }}</span>
                            <n-button size="small" tertiary type="error" @click="removeMember(row.id)">
                                {{ t('remove') }}
                            </n-button>
                        </n-space>
                    </n-list-item>
                </n-list>
            </n-space>
        </n-modal>

        <n-modal v-model:show="showRename" preset="dialog" :title="t('rename')">
            <n-form-item :label="t('name')">
                <n-input v-model:value="renameName" @keydown.enter="renameGroup" />
            </n-form-item>
            <template #action>
                <n-button type="primary" :loading="loading" @click="renameGroup">{{ t('save') }}</n-button>
            </template>
        </n-modal>

        <n-modal v-model:show="showDelete" preset="dialog" type="warning" :title="t('delete')">
            <p>{{ t('deleteConfirm', { name: selectedGroup?.name || '' }) }}</p>
            <template #action>
                <n-button type="error" :loading="loading" @click="deleteGroup">{{ t('delete') }}</n-button>
            </template>
        </n-modal>
    </div>
</template>
