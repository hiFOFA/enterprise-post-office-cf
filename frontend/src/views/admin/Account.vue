<script setup>
import { ref, h, onMounted, watch, computed } from 'vue';
import { NBadge, useMessage } from 'naive-ui'
import { useScopedI18n } from '@/i18n/app'

import { useGlobalState } from '../../store'
import { api } from '../../api'
import { hashPassword } from '../../utils'
import { displayAddressName, formatOwnerDisplay } from '../../utils/addressDisplay'
import { NButton, NMenu } from 'naive-ui';
import { MenuFilled } from '@vicons/material'
import AddressCredentialModal from '../../components/AddressCredentialModal.vue'

const {
    loading, adminTab, openSettings,
    adminMailTabAddress, adminSendBoxTabAddress,
    adminMailsSubTab, adminMailReloadAt, adminSendBoxReloadAt
} = useGlobalState()

const openAddressMails = (address) => {
    adminMailTabAddress.value = address;
    adminMailsSubTab.value = 'inbox';
    adminMailReloadAt.value = Date.now();
    adminTab.value = 'mails';
}

const openAddressSendBox = (address) => {
    adminSendBoxTabAddress.value = address;
    adminMailsSubTab.value = 'sendBox';
    adminSendBoxReloadAt.value = Date.now();
    adminTab.value = 'mails';
}
const message = useMessage()

const { t } = useScopedI18n('views.admin.Account')

const showEmailCredential = ref(false)
const curEmailCredential = ref("")
const curEmailAddress = ref("")
const curDeleteAddressId = ref(0);
const curClearInboxAddressId = ref(0);
const curClearSentItemsAddressId = ref(0);
const showResetPassword = ref(false);
const curResetPasswordAddressId = ref(0);
const newPassword = ref('');
const showBatchSettings = ref(false);
const batchNewPassword = ref('');

// Multi-action mode state
const checkedRowKeys = ref([]);
const showMultiActionModal = ref(false);
const multiActionProgress = ref({ percentage: 0, tip: '0/0' });
const multiActionTitle = ref('');

const selectedCount = computed(() => checkedRowKeys.value.length);
const showMultiActionBar = computed(() => checkedRowKeys.value.length > 0);

const addressQuery = ref("")
const groupId = ref(null)
const groups = ref([])
const sortBy = ref("")
const sortOrder = ref("")
const showNoteModal = ref(false)
const noteAddress = ref(null)
const noteDraft = ref("")

const data = ref([])
const count = ref(0)
const page = ref(1)
const pageSize = ref(20)
const showDeleteAccount = ref(false)
const showClearInbox = ref(false)
const showClearSentItems = ref(false)

const showCredential = async (row) => {
    try {
        curEmailAddress.value = row.name
        curEmailCredential.value = await api.adminShowAddressCredential(row.id)
        showEmailCredential.value = true
    } catch (error) {
        message.error(error.message || "error");
        showEmailCredential.value = false
        curEmailCredential.value = ""
        curEmailAddress.value = ""
    }
}

const deleteEmail = async () => {
    try {
        await api.adminDeleteAddress(curDeleteAddressId.value)
        message.success(t("success"));
        await fetchData()
    } catch (error) {
        message.error(error.message || "error");
    } finally {
        showDeleteAccount.value = false
    }
}

const clearInbox = async () => {
    try {
        await api.fetch(`/admin/clear_inbox/${curClearInboxAddressId.value}`, {
            method: 'DELETE'
        });
        message.success(t("success"));
        await fetchData()
    } catch (error) {
        message.error(error.message || "error");
    } finally {
        showClearInbox.value = false
    }
}

const clearSentItems = async () => {
    try {
        await api.fetch(`/admin/clear_sent_items/${curClearSentItemsAddressId.value}`, {
            method: 'DELETE'
        });
        message.success(t("success"));
        await fetchData()
    } catch (error) {
        message.error(error.message || "error");
    } finally {
        showClearSentItems.value = false
    }
}

const resetPassword = async () => {
    const normalizedPassword = newPassword.value.trim()
    if (!normalizedPassword) {
        message.error(t("newPassword"));
        return;
    }
    try {
        await api.fetch(`/admin/address/${curResetPasswordAddressId.value}/reset_password`, {
            method: 'POST',
            body: JSON.stringify({
                password: await hashPassword(normalizedPassword)
            })
        });
        message.success(t("passwordResetSuccess"));
        newPassword.value = '';
        showResetPassword.value = false;
    } catch (error) {
        message.error(error.message || "error");
    }
}

// Multi-action mode functions
const multiActionSelectAll = () => {
    checkedRowKeys.value = data.value.map(item => item.id);
}

const multiActionUnselectAll = () => {
    checkedRowKeys.value = [];
}

// 通用批量操作函数
const executeBatchOperation = async ({
    shouldSkip = () => false,
    apiCall,
    title,
    operationName = 'operation'
}) => {
    try {
        loading.value = true;
        const selectedAddresses = data.value.filter((item) =>
            checkedRowKeys.value.includes(item.id)
        );

        if (selectedAddresses.length === 0) {
            message.error(t('pleaseSelectAddress'));
            return;
        }

        const failedIds = [];
        const totalCount = selectedAddresses.length;

        multiActionProgress.value = {
            percentage: 0,
            tip: `0/${totalCount}`
        };
        multiActionTitle.value = title;
        showMultiActionModal.value = true;

        for (const [index, address] of selectedAddresses.entries()) {
            try {
                if (!shouldSkip(address)) {
                    await apiCall(address.id);
                }
            } catch (error) {
                console.error(`${operationName} failed for address ${address.id}:`, error);
                failedIds.push(address.id);
            }
            multiActionProgress.value = {
                percentage: Math.floor((index + 1) / totalCount * 100),
                tip: `${index + 1}/${totalCount}`
            };
        }

        await fetchData();
        checkedRowKeys.value = failedIds;
        message.success(t("success"));
    } catch (error) {
        message.error(error.message || "error");
    } finally {
        loading.value = false;
    }
}

const multiActionDeleteAccounts = async () => {
    await executeBatchOperation({
        apiCall: (id) => api.adminDeleteAddress(id),
        title: t('multiDelete') + ' ' + t('success'),
        operationName: 'Delete'
    });
}

const multiActionClearInbox = async () => {
    await executeBatchOperation({
        shouldSkip: (address) => address.mail_count <= 0,
        apiCall: (id) => api.fetch(`/admin/clear_inbox/${id}`, {
            method: 'DELETE'
        }),
        title: t('multiClearInbox') + ' ' + t('success'),
        operationName: 'ClearInbox'
    });
}

const multiActionClearSentItems = async () => {
    await executeBatchOperation({
        shouldSkip: (address) => address.send_count <= 0,
        apiCall: (id) => api.fetch(`/admin/clear_sent_items/${id}`, {
            method: 'DELETE'
        }),
        title: t('multiClearSentItems') + ' ' + t('success'),
        operationName: 'ClearSentItems'
    });
}

const applyBatchSettings = async () => {
    const normalizedPassword = batchNewPassword.value.trim()
    if (!normalizedPassword) {
        message.error(t("newPassword"));
        return;
    }
    const hashed = await hashPassword(normalizedPassword)
    showBatchSettings.value = false
    await executeBatchOperation({
        apiCall: (id) => api.fetch(`/admin/address/${id}/reset_password`, {
            method: 'POST',
            body: JSON.stringify({ password: hashed })
        }),
        title: t('multiSettings') + ' ' + t('success'),
        operationName: 'ResetPassword'
    });
    batchNewPassword.value = ''
}

const fetchGroups = async () => {
    try {
        const raw = await api.fetch('/admin/address_groups')
        groups.value = raw.results || []
    } catch (error) {
        console.error(error)
    }
}

const openNoteModal = (row) => {
    noteAddress.value = row
    noteDraft.value = row.note || ''
    showNoteModal.value = true
}

const saveNote = async () => {
    if (!noteAddress.value) return
    try {
        await api.fetch(`/admin/address/${noteAddress.value.id}/note`, {
            method: 'POST',
            body: JSON.stringify({ note: noteDraft.value })
        })
        message.success(t("success"))
        showNoteModal.value = false
        await fetchData()
    } catch (error) {
        message.error(error.message || "error")
    }
}

const fetchData = async () => {
    try {
        addressQuery.value = addressQuery.value.trim()
        const { results, count: addressCount } = await api.fetch(
            `/admin/address`
            + `?limit=${pageSize.value}`
            + `&offset=${(page.value - 1) * pageSize.value}`
            + (addressQuery.value ? `&query=${encodeURIComponent(addressQuery.value)}` : "")
            + (groupId.value ? `&group_id=${groupId.value}` : "")
            + (sortBy.value ? `&sort_by=${sortBy.value}` : "")
            + (sortOrder.value ? `&sort_order=${sortOrder.value}` : "")
        );
        data.value = results;
        if (page.value === 1 || addressCount > 0) {
            count.value = addressCount ?? 0;
        }
    } catch (error) {
        console.error(error);
        message.error(error.message || "error");
    }
}

const searchData = () => {
    if (page.value === 1) {
        fetchData();
    } else {
        page.value = 1;
    }
}

const handleSorterChange = (sorter) => {
    sortBy.value = sorter.columnKey || "";
    sortOrder.value = sorter.order || "";
    if (page.value === 1) {
        fetchData();
    } else {
        page.value = 1;
    }
}

const columns = computed(() => [
    {
        type: 'selection'
    },
    {
        title: "ID",
        key: "id",
        width: 72,
        minWidth: 72,
        ellipsis: false,
        sorter: true,
        sortOrder: sortBy.value === 'id' ? sortOrder.value : false
    },
    {
        title: t('name'),
        key: "name",
        sorter: true,
        sortOrder: sortBy.value === 'name' ? sortOrder.value : false,
        render(row) {
            const label = displayAddressName(row.note, row.name)
            if (row.note && row.name) {
                return h('span', { title: row.name }, label)
            }
            return label
        }
    },
    {
        title: t('owner'),
        key: "owner_username",
        render(row) {
            return formatOwnerDisplay({
                ...row,
                fallbackMain: t('ownerMain'),
                fallbackSub: t('ownerSub'),
            })
        }
    },
    {
        title: t('expires_at'),
        key: "expires_at",
        sorter: true,
        sortOrder: sortBy.value === 'expires_at' ? sortOrder.value : false
    },
    {
        title: t('created_at'),
        key: "created_at",
        sorter: true,
        sortOrder: sortBy.value === 'created_at' ? sortOrder.value : false
    },
    {
        title: t('updated_at'),
        key: "updated_at",
        sorter: true,
        sortOrder: sortBy.value === 'updated_at' ? sortOrder.value : false
    },
    {
        title: t('mail_count'),
        key: "mail_count",
        sorter: true,
        sortOrder: sortBy.value === 'mail_count' ? sortOrder.value : false,
        render(row) {
            return h(NButton,
                {
                    text: true,
                    onClick: () => {
                        if (row.mail_count > 0) {
                            openAddressMails(row.name);
                        }
                    }
                },
                {
                    icon: () => h(NBadge, {
                        value: row.mail_count,
                        'show-zero': true,
                        max: 99,
                        type: "success"
                    }),
                    default: () => row.mail_count > 0 ? t('viewMails') : ""
                }
            )
        }
    },
    {
        title: t('send_count'),
        key: "send_count",
        sorter: true,
        sortOrder: sortBy.value === 'send_count' ? sortOrder.value : false,
        render(row) {
            return h(NButton,
                {
                    text: true,
                    onClick: () => {
                        if (row.send_count > 0) {
                            openAddressSendBox(row.name);
                        }
                    }
                },
                {
                    icon: () => h(NBadge, {
                        value: row.send_count,
                        'show-zero': true,
                        max: 99,
                        type: "success"
                    }),
                    default: () => row.send_count > 0 ? t('viewSendBox') : ""
                }
            )
        }
    },
    {
        title: t('actions'),
        key: 'actions',
        render(row) {
            return h('div', [
                h(NMenu, {
                    mode: "horizontal",
                    options: [
                        {
                            label: t('actions'),
                            icon: () => h(MenuFilled),
                            key: "action",
                            children: [
                                {
                                    label: () => h(NButton,
                                        {
                                            text: true,
                                            onClick: () => showCredential(row)
                                        },
                                        { default: () => t('showCredential') }
                                    ),
                                },
                                {
                                    label: () => h(NButton,
                                        {
                                            text: true,
                                            onClick: () => openNoteModal(row)
                                        },
                                        { default: () => t('editNote') }
                                    ),
                                },
                                {
                                    label: () => h(NButton,
                                        {
                                            text: true,
                                            onClick: () => {
                                                openAddressMails(row.name);
                                            }
                                        },
                                        { default: () => t('viewMails') }
                                    ),
                                    show: row.mail_count > 0
                                },
                                {
                                    label: () => h(NButton,
                                        {
                                            text: true,
                                            onClick: () => {
                                                openAddressSendBox(row.name);
                                            }
                                        },
                                        { default: () => t('viewSendBox') }
                                    ),
                                    show: row.send_count > 0
                                },
                                {
                                    label: () => h(NButton,
                                        {
                                            text: true,
                                            onClick: () => {
                                                curClearInboxAddressId.value = row.id;
                                                showClearInbox.value = true;
                                            }
                                        },
                                        { default: () => t('clearInbox') }
                                    ),
                                    show: row.mail_count > 0
                                },
                                {
                                    label: () => h(NButton,
                                        {
                                            text: true,
                                            onClick: () => {
                                                curClearSentItemsAddressId.value = row.id;
                                                showClearSentItems.value = true;
                                            }
                                        },
                                        { default: () => t('clearSentItems') }
                                    ),
                                    show: row.send_count > 0
                                },
                                {
                                    label: () => h(NButton,
                                        {
                                            text: true,
                                            onClick: () => {
                                                curResetPasswordAddressId.value = row.id;
                                                showResetPassword.value = true;
                                            }
                                        },
                                        { default: () => t('resetPassword') }
                                    ),
                                    show: openSettings.value?.enableAddressPassword
                                },
                                {
                                    label: () => h(NButton,
                                        {
                                            text: true,
                                            onClick: () => {
                                                curDeleteAddressId.value = row.id;
                                                showDeleteAccount.value = true;
                                            }
                                        },
                                        { default: () => t('delete') }
                                    )
                                }
                            ]
                        }
                    ]
                })
            ])
        }
    }
])

watch([page, pageSize, groupId], async () => {
    await fetchData()
})

onMounted(async () => {
    await Promise.all([fetchData(), fetchGroups()])
})
</script>

<template>
    <div style="margin-top: 10px;">
        <AddressCredentialModal v-model:show="showEmailCredential" :address="curEmailAddress"
            :jwt="curEmailCredential" />
        <n-modal v-model:show="showDeleteAccount" preset="dialog" :title="t('deleteAccount')">
            <p>{{ t('deleteTip') }}</p>
            <template #action>
                <n-button :loading="loading" @click="deleteEmail" size="small" tertiary type="error">
                    {{ t('deleteAccount') }}
                </n-button>
            </template>
        </n-modal>
        <n-modal v-model:show="showClearInbox" preset="dialog" :title="t('clearInbox')">
            <p>{{ t('clearInboxTip') }}</p>
            <template #action>
                <n-button :loading="loading" @click="clearInbox" size="small" tertiary type="error">
                    {{ t('clearInbox') }}
                </n-button>
            </template>
        </n-modal>
        <n-modal v-model:show="showClearSentItems" preset="dialog" :title="t('clearSentItems')">
            <p>{{ t('clearSentItemsTip') }}</p>
            <template #action>
                <n-button :loading="loading" @click="clearSentItems" size="small" tertiary type="error">
                    {{ t('clearSentItems') }}
                </n-button>
            </template>
        </n-modal>

        <n-modal v-model:show="showResetPassword" preset="dialog" :title="t('resetPassword')">
            <n-form-item :label="t('newPassword')">
                <n-input v-model:value="newPassword" type="password" placeholder="" show-password-on="click"
                    @keyup.enter="resetPassword" />
            </n-form-item>
            <template #action>
                <n-button :loading="loading" @click="resetPassword" size="small" tertiary type="info">
                    {{ t('resetPassword') }}
                </n-button>
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
        <n-modal v-model:show="showNoteModal" preset="dialog" :title="t('editNote')">
            <n-form-item :label="t('note')">
                <n-input v-model:value="noteDraft" type="textarea" :placeholder="t('notePlaceholder')"
                    :maxlength="200" show-count />
            </n-form-item>
            <n-text depth="3">{{ noteAddress?.name }}</n-text>
            <template #action>
                <n-button :loading="loading" type="primary" @click="saveNote">{{ t('saveNote') }}</n-button>
            </template>
        </n-modal>
        <n-input-group style="margin-bottom: 10px;">
            <n-select v-model:value="groupId" clearable :placeholder="t('allGroups')"
                :options="groups.map((item) => ({ label: item.name, value: item.id }))"
                style="width: 180px;" />
            <n-input v-model:value="addressQuery" clearable :placeholder="t('addressQueryTip')"
                @keydown.enter="searchData" />
            <n-button @click="searchData" type="primary" tertiary>
                {{ t('query') }}
            </n-button>
        </n-input-group>

        <n-space v-if="showMultiActionBar" style="margin-bottom: 10px;">
            <n-button @click="multiActionSelectAll" tertiary>
                {{ t('selectAll') }}
            </n-button>
            <n-button @click="multiActionUnselectAll" tertiary>
                {{ t('unselectAll') }}
            </n-button>
            <n-popconfirm @positive-click="multiActionDeleteAccounts">
                <template #trigger>
                    <n-button tertiary type="error">{{ t('multiDelete') }}</n-button>
                </template>
                {{ t('multiDeleteTip') }}
            </n-popconfirm>
            <n-popconfirm @positive-click="multiActionClearInbox">
                <template #trigger>
                    <n-button tertiary type="warning">{{ t('multiClearInbox') }}</n-button>
                </template>
                {{ t('multiClearInboxTip') }}
            </n-popconfirm>
            <n-popconfirm @positive-click="multiActionClearSentItems">
                <template #trigger>
                    <n-button tertiary type="warning">{{ t('multiClearSentItems') }}</n-button>
                </template>
                {{ t('multiClearSentItemsTip') }}
            </n-popconfirm>
            <n-button tertiary type="info" @click="showBatchSettings = true">
                {{ t('multiSettings') }}
            </n-button>
            <n-tag type="info">
                {{ t('selectedItems') }}: {{ selectedCount }}
            </n-tag>
        </n-space>
        <div style="overflow: auto;">
            <div style="display: inline-block;">
                <n-pagination v-model:page="page" v-model:page-size="pageSize" :item-count="count"
                    :page-sizes="[20, 50, 100]" show-size-picker>
                    <template #prefix="{ itemCount }">
                        {{ t('itemCount') }}: {{ itemCount }}
                    </template>
                </n-pagination>
            </div>
            <n-data-table v-model:checked-row-keys="checkedRowKeys" :columns="columns" :data="data" :bordered="false"
                :row-key="row => row.id" remote @update:sorter="handleSorterChange" embedded />
        </div>

        <!-- Multi-action progress modal -->
        <n-modal v-model:show="showMultiActionModal" preset="dialog" :title="multiActionTitle" negative-text="OK">
            <n-space justify="center">
                <n-progress type="circle" status="info" :percentage="multiActionProgress.percentage">
                    <span style="text-align: center">
                        {{ multiActionProgress.tip }}
                    </span>
                </n-progress>
            </n-space>
        </n-modal>

    </div>
</template>

<style scoped>
.n-pagination {
    margin-top: 10px;
    margin-bottom: 10px;
}

.n-data-table {
    min-width: 1000px;
}
</style>
