<script setup>
import { computed, h, onMounted, ref } from 'vue'
import { useScopedI18n } from '@/i18n/app'
import { NButton, NSwitch } from 'naive-ui'

import { useGlobalState } from '../../store'
import { api } from '../../api'
import { hashPassword } from '../../utils'

const { loading } = useGlobalState()
const message = useMessage()
const { t } = useScopedI18n('views.admin.SubAdmins')

const data = ref([])
const showCreate = ref(false)
const showAddQuota = ref(false)
const showChangePassword = ref(false)
const showDelete = ref(false)
const creating = ref({ username: '', password: '', quota_balance: 0 })
const quotaTarget = ref(null)
const quotaDelta = ref(0)
const passwordTarget = ref(null)
const newPassword = ref('')
const deleteTarget = ref(null)

const isEnabled = (row) => row.enabled === 1 || row.enabled === true

const parseList = (raw) => {
    if (Array.isArray(raw)) return raw
    if (Array.isArray(raw?.results)) return raw.results
    if (Array.isArray(raw?.list)) return raw.list
    return []
}

const fetchData = async () => {
    try {
        const raw = await api.fetch('/admin/sub_admins')
        data.value = parseList(raw)
    } catch (error) {
        message.error(error.message || 'error')
    }
}

const createSubAdmin = async () => {
    if (!creating.value.username || !creating.value.password) {
        message.error(t('pleaseInput'))
        return
    }
    try {
        await api.fetch('/admin/sub_admins', {
            method: 'POST',
            body: JSON.stringify({
                username: creating.value.username,
                password: await hashPassword(creating.value.password),
                quota_balance: Math.floor(Number(creating.value.quota_balance) || 0),
            }),
        })
        message.success(t('success'))
        showCreate.value = false
        creating.value = { username: '', password: '', quota_balance: 0 }
        await fetchData()
    } catch (error) {
        message.error(error.message || 'error')
    }
}

const updateSubAdmin = async (id, body) => {
    await api.fetch(`/admin/sub_admins/${id}`, {
        method: 'POST',
        body: JSON.stringify(body),
    })
}

const toggleEnabled = async (row, enabled) => {
    try {
        await updateSubAdmin(row.id, { enabled: enabled ? 1 : 0 })
        message.success(t('success'))
        await fetchData()
    } catch (error) {
        message.error(error.message || 'error')
        await fetchData()
    }
}

const openAddQuota = (row) => {
    quotaTarget.value = row
    quotaDelta.value = 0
    showAddQuota.value = true
}

const addQuota = async () => {
    if (!quotaTarget.value) return
    const delta = Number(quotaDelta.value)
    if (!Number.isFinite(delta) || delta === 0) {
        message.error(t('invalidQuota'))
        return
    }
    try {
        await api.fetch(`/admin/sub_admins/${quotaTarget.value.id}/quota`, {
            method: 'POST',
            body: JSON.stringify({
                delta,
                reason: 'recharge',
            }),
        })
        message.success(t('success'))
        showAddQuota.value = false
        await fetchData()
    } catch (error) {
        message.error(error.message || 'error')
    }
}

const openChangePassword = (row) => {
    passwordTarget.value = row
    newPassword.value = ''
    showChangePassword.value = true
}

const changePassword = async () => {
    if (!passwordTarget.value || !newPassword.value) {
        message.error(t('pleaseInputPassword'))
        return
    }
    try {
        await updateSubAdmin(passwordTarget.value.id, {
            password: await hashPassword(newPassword.value),
        })
        message.success(t('success'))
        showChangePassword.value = false
        newPassword.value = ''
        passwordTarget.value = null
    } catch (error) {
        message.error(error.message || 'error')
    }
}

const openDelete = (row) => {
    deleteTarget.value = row
    showDelete.value = true
}

const deleteSubAdmin = async () => {
    if (!deleteTarget.value) return
    try {
        await api.fetch(`/admin/sub_admins/${deleteTarget.value.id}`, {
            method: 'DELETE',
        })
        message.success(t('success'))
        showDelete.value = false
        deleteTarget.value = null
        await fetchData()
    } catch (error) {
        message.error(error.message || 'error')
    }
}

const actionButtonStyle = {
    display: 'inline-flex',
    flex: '0 0 auto',
}

const columns = computed(() => [
    { title: 'ID', key: 'id' },
    { title: t('username'), key: 'username' },
    {
        title: t('quotaBalance'),
        key: 'quota_balance',
        render(row) {
            return row.quota_balance ?? row.balance ?? 0
        },
    },
    {
        title: t('enabled'),
        key: 'enabled',
        render(row) {
            const enabled = isEnabled(row)
            return h('div', {
                style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    whiteSpace: 'nowrap',
                },
            }, [
                h(NSwitch, {
                    value: enabled,
                    onUpdateValue: (val) => toggleEnabled(row, val),
                }),
                h('span', {}, enabled ? t('enabledOn') : t('enabledOff')),
            ])
        },
    },
    {
        title: t('created_at'),
        key: 'created_at',
    },
    {
        title: t('actions'),
        key: 'actions',
        minWidth: 360,
        ellipsis: false,
        render(row) {
            const enabled = isEnabled(row)
            return h('div', {
                style: {
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    alignItems: 'center',
                    maxWidth: '100%',
                },
            }, [
                h(NButton, {
                    size: 'small',
                    tertiary: true,
                    type: 'primary',
                    style: actionButtonStyle,
                    onClick: () => openAddQuota(row),
                }, { default: () => t('addQuota') }),
                h(NButton, {
                    size: 'small',
                    tertiary: true,
                    type: 'info',
                    style: actionButtonStyle,
                    onClick: () => openChangePassword(row),
                }, { default: () => t('changePassword') }),
                h(NButton, {
                    size: 'small',
                    tertiary: true,
                    type: enabled ? 'warning' : 'success',
                    style: actionButtonStyle,
                    onClick: () => toggleEnabled(row, !enabled),
                }, { default: () => enabled ? t('disable') : t('enable') }),
                h(NButton, {
                    size: 'small',
                    tertiary: true,
                    type: 'error',
                    style: actionButtonStyle,
                    onClick: () => openDelete(row),
                }, { default: () => t('delete') }),
            ])
        },
    },
])

onMounted(fetchData)
</script>

<template>
    <div style="margin-top: 10px;">
        <n-space justify="space-between" style="margin-bottom: 12px;">
            <n-text>{{ t('tip') }}</n-text>
            <n-button type="primary" @click="showCreate = true">{{ t('create') }}</n-button>
        </n-space>
        <n-data-table :columns="columns" :data="data" :bordered="false" :single-line="false" embedded />

        <n-modal v-model:show="showCreate" preset="dialog" :title="t('create')">
            <n-form>
                <n-form-item :label="t('username')" required>
                    <n-input v-model:value="creating.username" />
                </n-form-item>
                <n-form-item :label="t('password')" required>
                    <n-input v-model:value="creating.password" type="password" show-password-on="click" />
                </n-form-item>
                <n-form-item :label="t('initialQuota')">
                    <n-input-number v-model:value="creating.quota_balance" :min="0" style="width: 100%;" />
                </n-form-item>
            </n-form>
            <template #action>
                <n-button type="primary" :loading="loading" @click="createSubAdmin">{{ t('create') }}</n-button>
            </template>
        </n-modal>

        <n-modal v-model:show="showAddQuota" preset="dialog" :title="t('addQuota')">
            <n-form-item :label="t('quotaDelta')">
                <n-input-number v-model:value="quotaDelta" style="width: 100%;" />
            </n-form-item>
            <n-text depth="3">{{ t('quotaDeltaTip') }}</n-text>
            <template #action>
                <n-button type="primary" :loading="loading" @click="addQuota">{{ t('save') }}</n-button>
            </template>
        </n-modal>

        <n-modal v-model:show="showChangePassword" preset="dialog" :title="t('changePassword')">
            <n-form>
                <n-form-item :label="t('username')">
                    <n-input :value="passwordTarget?.username || ''" disabled />
                </n-form-item>
                <n-form-item :label="t('newPassword')" required>
                    <n-input v-model:value="newPassword" type="password" show-password-on="click"
                        @keyup.enter="changePassword" />
                </n-form-item>
            </n-form>
            <template #action>
                <n-button type="primary" :loading="loading" @click="changePassword">{{ t('save') }}</n-button>
            </template>
        </n-modal>

        <n-modal v-model:show="showDelete" preset="dialog" type="warning" :title="t('delete')">
            <p>{{ t('deleteConfirm', { username: deleteTarget?.username || '' }) }}</p>
            <n-text depth="3">{{ t('deleteConfirmTip') }}</n-text>
            <template #action>
                <n-button type="error" :loading="loading" @click="deleteSubAdmin">{{ t('delete') }}</n-button>
            </template>
        </n-modal>
    </div>
</template>
