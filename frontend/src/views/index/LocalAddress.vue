<script setup lang="ts">
import { ref, h, computed, onMounted, watch } from 'vue';
import { useLocalStorage } from '@vueuse/core';
import { useScopedI18n } from '@/i18n/app'
import { NPopconfirm, NButton } from 'naive-ui'

// @ts-ignore
import { useGlobalState } from '../../store'
// @ts-ignore
import Login from '../common/Login.vue';
// @ts-ignore
import { api } from '../../api'
import { decodeJwtPayload, hashPassword, LOCAL_ADDRESS_CACHE_KEY } from '../../utils'
import { displayAddressName } from '../../utils/addressDisplay'

const { jwt, loading } = useGlobalState()
// @ts-ignore
const message = useMessage()

const { t } = useScopedI18n('views.index.LocalAddress')

const tabValue = ref('address')
const localAddressCache = useLocalStorage(LOCAL_ADDRESS_CACHE_KEY, []);
const groupId = ref<number | null>(null)
const groups = ref<{ id: number, name: string }[]>([])
const notesById = ref<Record<number, string>>({})
const memberIds = ref<number[]>([])
const checkedRowKeys = ref<string[]>([])
const showBatchSettings = ref(false)
const batchNewPassword = ref('')
const showBatchProgress = ref(false)
const batchProgress = ref({ percentage: 0, tip: '0/0' })
const showNoteModal = ref(false)
const noteDraft = ref('')
const noteTarget = ref<{ id: number, address: string, jwt: string } | null>(null)

const allRows = computed(() => {
    // @ts-ignore
    if (jwt.value && !localAddressCache.value.includes(jwt.value)) {
        // @ts-ignore
        localAddressCache.value.push(jwt.value)
    }
    return localAddressCache.value.map((curJwt: string) => {
        const payload = decodeJwtPayload(curJwt)
        const addressId = Number(payload?.address_id)
        if (payload && typeof payload.address === 'string') {
            return {
                valid: true,
                address: payload.address,
                address_id: Number.isInteger(addressId) && addressId > 0 ? addressId : null,
                note: Number.isInteger(addressId) ? (notesById.value[addressId] || '') : '',
                jwt: curJwt
            }
        }
        return {
            valid: false,
            address: `invalid jwt [${curJwt}]`,
            address_id: null,
            note: '',
            jwt: curJwt
        }
    })
})

const data = computed(() => {
    if (!groupId.value) return allRows.value
    const allowed = new Set(memberIds.value)
    return allRows.value.filter((row) => row.address_id && allowed.has(row.address_id))
})

const fetchLocalMeta = async () => {
    try {
        const [groupRes, noteRes] = await Promise.all([
            api.fetch('/api/address_groups'),
            api.fetch('/api/address_notes'),
        ])
        groups.value = groupRes.results || []
        const next: Record<number, string> = {}
        for (const row of (noteRes.results || [])) {
            if (row.address_id) next[Number(row.address_id)] = row.note || ''
        }
        notesById.value = next
    } catch (error) {
        console.error(error)
    }
}

const openNoteModal = (row: any) => {
    if (!row.address_id) return
    noteTarget.value = { id: row.address_id, address: row.address, jwt: row.jwt }
    noteDraft.value = row.note || ''
    showNoteModal.value = true
}

const saveNote = async () => {
    if (!noteTarget.value) return
    try {
        await api.fetch(`/api/address/${noteTarget.value.id}/note`, {
            method: 'POST',
            jwt: jwt.value,
            body: JSON.stringify({ note: noteDraft.value }),
        })
        notesById.value = {
            ...notesById.value,
            [noteTarget.value.id]: noteDraft.value.trim(),
        }
        showNoteModal.value = false
        message.success(t('success'))
    } catch (error) {
        message.error((error as Error).message || 'error')
    }
}

const fetchGroupMembers = async () => {
    if (!groupId.value) {
        memberIds.value = []
        return
    }
    try {
        const raw = await api.fetch(`/api/address_groups/${groupId.value}/members`)
        memberIds.value = (raw.results || []).map((row: { id: number }) => row.id)
    } catch (error) {
        console.error(error)
        memberIds.value = []
    }
}

const selectedCount = computed(() => checkedRowKeys.value.length)
const showMultiActionBar = computed(() => checkedRowKeys.value.length > 0)

const bindAddress = async () => {
    try {
        // @ts-ignore
        if (jwt.value && !localAddressCache.value.includes(jwt.value)) {
            // @ts-ignore
            localAddressCache.value.push(jwt.value)
        }
        tabValue.value = 'address'
        message.success(t('bindAddressSuccess'));
    } catch (error) {
        message.error((error as Error).message || "error");
    }
}

const removeFromLocal = (targetJwt: string) => {
    if (jwt.value === targetJwt) {
        return
    }
    localAddressCache.value = localAddressCache.value.filter(
        (curJwt: string) => curJwt !== targetJwt
    )
    checkedRowKeys.value = checkedRowKeys.value.filter((key) => key !== targetJwt)
}

const multiUnselectAll = () => {
    checkedRowKeys.value = []
}

const multiSelectAll = () => {
    checkedRowKeys.value = data.value.map((row) => row.jwt)
}

const batchRemoveLocal = () => {
    const current = jwt.value
    const toRemove = new Set(checkedRowKeys.value.filter((key) => key !== current))
    localAddressCache.value = localAddressCache.value.filter(
        (curJwt: string) => !toRemove.has(curJwt)
    )
    checkedRowKeys.value = checkedRowKeys.value.filter((key) => key === current)
    message.success(t('success'))
}

const applyBatchSettings = async () => {
    const normalizedPassword = batchNewPassword.value.trim()
    if (!normalizedPassword) {
        message.error(t('newPasswordRequired'))
        return
    }
    const selectedJwts = checkedRowKeys.value.filter(Boolean)
    if (selectedJwts.length === 0) {
        message.error(t('pleaseSelectAddress'))
        return
    }
    const hashed = await hashPassword(normalizedPassword)
    showBatchSettings.value = false
    const failed: string[] = []
    showBatchProgress.value = true
    for (const [index, curJwt] of selectedJwts.entries()) {
        try {
            await api.fetch('/api/address_change_password', {
                method: 'POST',
                jwt: curJwt,
                body: JSON.stringify({
                    new_password: hashed
                })
            })
        } catch (error) {
            console.error(error)
            failed.push(curJwt)
        }
        batchProgress.value = {
            percentage: Math.floor((index + 1) / selectedJwts.length * 100),
            tip: `${index + 1}/${selectedJwts.length}`
        }
    }
    checkedRowKeys.value = failed
    batchNewPassword.value = ''
    message.success(t('success'))
}

const columns = [
    {
        type: 'selection'
    },
    {
        title: t('address'),
        key: "address",
        render(row: any) {
            const label = displayAddressName(row.note, row.address)
            if (row.note && row.address) {
                return h('span', { title: row.address }, label)
            }
            return label
        }
    },
    {
        title: t('actions'),
        key: 'actions',
        render(row: any) {
            return h('div', [
                h(NButton, {
                    tertiary: true,
                    disabled: !row.address_id,
                    onClick: () => openNoteModal(row)
                }, { default: () => t('editNote') }),
                h(NPopconfirm,
                    {
                        onPositiveClick: () => {
                            jwt.value = row.jwt
                            location.reload()
                        }
                    },
                    {
                        trigger: () => h(NButton,
                            {
                                tertiary: true,
                                type: "primary",
                            },
                            { default: () => t('changeMailAddress') }
                        ),
                        default: () => `${t('changeMailAddress')}?`
                    }
                ),
                h(NPopconfirm,
                    {
                        onPositiveClick: () => removeFromLocal(row.jwt)
                    },
                    {
                        trigger: () => h(NButton,
                            {
                                tertiary: true,
                                disabled: jwt.value === row.jwt,
                                type: "warning",
                            },
                            { default: () => t('unbindMailAddress') }
                        ),
                        default: () => `${t('unbindMailAddress')}?`
                    }
                )
            ])
        }
    }
]

watch(groupId, fetchGroupMembers)
onMounted(async () => {
    await fetchLocalMeta()
    await fetchGroupMembers()
})
</script>

<template>
    <div>
        <n-alert type="warning" :show-icon="false" :bordered="false">
            <span>{{ t('tip') }}</span>
        </n-alert>
        <n-tabs type="segment" v-model:value="tabValue">
            <n-tab-pane name="address" :tab="t('address')">
                <n-select v-model:value="groupId" clearable :placeholder="t('allGroups')"
                    :options="groups.map((item) => ({ label: item.name, value: item.id }))"
                    style="width: 220px; margin-bottom: 10px;" />
                <n-space v-if="showMultiActionBar" style="margin-bottom: 10px;">
                    <n-button @click="multiSelectAll" tertiary>{{ t('selectAll') }}</n-button>
                    <n-button @click="multiUnselectAll" tertiary>{{ t('unselectAll') }}</n-button>
                    <n-popconfirm @positive-click="batchRemoveLocal">
                        <template #trigger>
                            <n-button tertiary type="error">{{ t('multiDelete') }}</n-button>
                        </template>
                        {{ t('multiDeleteTip') }}
                    </n-popconfirm>
                    <n-button tertiary type="info" @click="showBatchSettings = true">
                        {{ t('multiSettings') }}
                    </n-button>
                    <n-tag type="info">{{ t('selectedItems') }}: {{ selectedCount }}</n-tag>
                </n-space>
                <div class="address-table-scroll">
                    <n-data-table v-model:checked-row-keys="checkedRowKeys" :columns="columns" :data="data"
                        :bordered="false" embedded :row-key="(row: any) => row.jwt" />
                </div>
            </n-tab-pane>
            <n-tab-pane name="create_or_bind" :tab="t('create_or_bind')">
                <Login :bindUserAddress="bindAddress" />
            </n-tab-pane>
        </n-tabs>
        <n-modal v-model:show="showNoteModal" preset="dialog" :title="t('editNote')">
            <n-form-item :label="t('editNote')">
                <n-input v-model:value="noteDraft" type="textarea" :maxlength="200" show-count
                    :placeholder="noteTarget?.address || ''" />
            </n-form-item>
            <template #action>
                <n-button type="primary" :loading="loading" @click="saveNote">{{ t('editNote') }}</n-button>
            </template>
        </n-modal>
        <n-modal v-model:show="showBatchSettings" preset="dialog" :title="t('multiSettings')">
            <p>{{ t('multiSettingsTip') }}</p>
            <n-form-item :label="t('newPassword')">
                <n-input v-model:value="batchNewPassword" type="password" show-password-on="click"
                    @keyup.enter="applyBatchSettings" />
            </n-form-item>
            <template #action>
                <n-button :loading="loading" @click="applyBatchSettings" size="small" tertiary type="info">
                    {{ t('multiSettings') }}
                </n-button>
            </template>
        </n-modal>
        <n-modal v-model:show="showBatchProgress" preset="dialog" :title="t('multiSettings')" negative-text="OK">
            <n-space justify="center">
                <n-progress type="circle" status="info" :percentage="batchProgress.percentage">
                    <span style="text-align: center">{{ batchProgress.tip }}</span>
                </n-progress>
            </n-space>
        </n-modal>
    </div>
</template>

<style scoped>
.n-data-table {
    min-width: 640px;
}

.address-table-scroll {
    max-width: 100%;
    overflow-x: auto;
}
</style>
