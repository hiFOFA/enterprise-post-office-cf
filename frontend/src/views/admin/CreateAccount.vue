<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useScopedI18n } from '@/i18n/app'

import { useGlobalState } from '../../store'
import { api } from '../../api'
import AddressCredentialModal from '../../components/AddressCredentialModal.vue'

const {
    loading, openSettings, isSubAdmin,
} = useGlobalState()
const message = useMessage()

const { t } = useScopedI18n('views.admin.CreateAccount')

const enablePrefix = ref(true)
const subdomainMode = ref("normal")
const customSubdomain = ref("")
const emailName = ref("")
const emailDomain = ref("")
const expireDays = ref(90)
const emailNote = ref("")
const emailGroupId = ref(null)
const groups = ref([])
const showReultModal = ref(false)
const result = ref("")
const addressPassword = ref("")
const createdAddress = ref("")

const canUseRandomSubdomain = computed(() => {
    if (!emailDomain.value) {
        return false
    }
    return (openSettings.value.randomSubdomainDomains || []).includes(emailDomain.value)
})

const maxExpireDays = computed(() => isSubAdmin.value ? 90 : 3650)
const groupOptions = computed(() => [
    { label: t('groupAuto'), value: null },
    ...groups.value.map((item) => ({ label: item.name, value: item.id })),
])

const fetchGroups = async () => {
    try {
        const raw = await api.fetch('/admin/address_groups')
        groups.value = raw.results || []
    } catch (error) {
        console.error(error)
    }
}

watch(canUseRandomSubdomain, (enabled) => {
    if (!enabled) {
        subdomainMode.value = "normal"
    }
})

watch(maxExpireDays, (max) => {
    if (expireDays.value > max) {
        expireDays.value = max
    }
})

const newEmail = async () => {
    if (!emailName.value || !emailDomain.value) {
        message.error(t('fillInAllFields'))
        return
    }
    if (!expireDays.value || expireDays.value < 1 || expireDays.value > maxExpireDays.value) {
        message.error(t('expireDaysSubTip'))
        return
    }
    try {
        const domain = subdomainMode.value === "custom"
            ? `${customSubdomain.value.trim()}.${emailDomain.value}`
            : emailDomain.value
        const res = await api.fetch(`/admin/new_address`, {
            method: 'POST',
            body: JSON.stringify({
                enablePrefix: enablePrefix.value,
                enableRandomSubdomain: subdomainMode.value === "random",
                name: emailName.value,
                domain,
                expire: expireDays.value,
                expire_days: expireDays.value,
                note: emailNote.value.trim(),
                group_id: emailGroupId.value || undefined,
            })
        })
        result.value = res["jwt"];
        addressPassword.value = res["password"] || '';
        createdAddress.value = res["address"] || '';
        message.success(t('successTip'))
        showReultModal.value = true
    } catch (error) {
        message.error(error.message || "error");
    }
}

onMounted(async () => {
    if (openSettings.prefix) {
        enablePrefix.value = true
    }
    emailDomain.value = openSettings.value.domains?.[0]?.value || ""
    await fetchGroups()
})
</script>

<template>
    <div class="center">
        <AddressCredentialModal v-model:show="showReultModal" :address="createdAddress" :jwt="result"
            :address-password="addressPassword" />
        <n-card :bordered="false" embedded style="max-width: 600px;">
            <n-form-item-row v-if="openSettings.prefix" :label="t('enablePrefix')">
                <n-switch v-model:value="enablePrefix" :round="false" />
            </n-form-item-row>
            <n-form-item-row :label="t('address')">
                <n-input-group>
                    <n-input-group-label v-if="enablePrefix && openSettings.prefix">
                        {{ openSettings.prefix }}
                    </n-input-group-label>
                    <n-input v-model:value="emailName" />
                    <n-input-group-label>@</n-input-group-label>
                    <n-select v-model:value="emailDomain" :consistent-menu-width="false"
                        :options="openSettings.domains" />
                </n-input-group>
            </n-form-item-row>
            <n-form-item-row v-if="canUseRandomSubdomain">
                <div style="width: 100%;">
                    <n-radio-group v-model:value="subdomainMode">
                        <n-space vertical>
                            <n-radio value="normal">{{ t('normalSubdomain') }}</n-radio>
                            <n-radio value="random">{{ t('enableRandomSubdomain') }}</n-radio>
                            <n-radio value="custom">{{ t('enableCustomSubdomain') }}</n-radio>
                        </n-space>
                    </n-radio-group>
                    <p v-if="subdomainMode === 'random'" style="margin: 8px 0 0; opacity: 0.75;">
                        {{ t('randomSubdomainTip') }}
                    </p>
                    <n-input-group v-if="subdomainMode === 'custom'" style="margin-top: 8px;">
                        <n-input v-model:value="customSubdomain" />
                        <n-input-group-label>.{{ emailDomain }}</n-input-group-label>
                    </n-input-group>
                </div>
            </n-form-item-row>
            <n-form-item-row :label="t('expireDays')">
                <n-input-number v-model:value="expireDays" :min="1" :max="maxExpireDays" style="width: 100%;" />
            </n-form-item-row>
            <n-form-item-row :label="t('group')">
                <n-select v-model:value="emailGroupId" :options="groupOptions" style="width: 100%;" />
            </n-form-item-row>
            <n-form-item-row :label="t('note')">
                <n-input v-model:value="emailNote" type="textarea" :placeholder="t('notePlaceholder')"
                    :maxlength="200" show-count />
            </n-form-item-row>
            <n-text v-if="isSubAdmin" depth="3" style="display: block; margin-bottom: 12px;">
                {{ t('expireDaysSubTip') }}
            </n-text>
            <n-button @click="newEmail" type="primary" block :loading="loading"
                :disabled="subdomainMode === 'custom' && !customSubdomain.trim()">
                {{ t('creatNewEmail') }}
            </n-button>
        </n-card>
    </div>
</template>

<style scoped>
.center {
    display: flex;
    text-align: left;
    place-items: center;
    justify-content: center;
    margin: 20px;
}
</style>
