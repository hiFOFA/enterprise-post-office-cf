<script setup>
import { onMounted, ref } from 'vue'
import { useScopedI18n } from '@/i18n/app'

import { useIsMobile } from '../../utils/composables'
import { useGlobalState } from '../../store'
import { api } from '../../api'
import { normalizeHideAbout } from '../../utils/hideAbout'
const props = defineProps({
    showUseSimpleIndex: {
        type: Boolean,
        default: false
    },
    showHideAboutConfig: {
        type: Boolean,
        default: false
    }
})

const {
    mailboxSplitSize, mailListView, mailListPreviewLineClamp, useIframeShowMail, preferShowTextMail, configAutoRefreshInterval,
    globalTabplacement, useSideMargin, useUTCDate, useSimpleIndex, autoLoadRemoteImages,
    openSettings, canConfigureHideAbout
} = useGlobalState()
const isMobile = useIsMobile()
const message = useMessage()
const savingHideAbout = ref(false)

const { t } = useScopedI18n('views.common.Appearance')

const updateHideAbout = async (role, value) => {
    const prev = normalizeHideAbout(openSettings.value.hideAbout)
    openSettings.value.hideAbout = { ...prev, [role]: value }
    savingHideAbout.value = true
    try {
        await api.fetch('/admin/global_ui_prefs', {
            method: 'POST',
            body: JSON.stringify({ hideAbout: openSettings.value.hideAbout })
        })
        message.success(t('successTip'))
    } catch (error) {
        openSettings.value.hideAbout = prev
        message.error(error.message || 'error')
    } finally {
        savingHideAbout.value = false
    }
}

onMounted(async () => {
    if (!props.showHideAboutConfig || !canConfigureHideAbout.value) return
    try {
        const res = await api.fetch('/admin/global_ui_prefs')
        if (res?.hideAbout) {
            openSettings.value.hideAbout = normalizeHideAbout(res.hideAbout)
        }
    } catch (error) {
        console.error(error)
    }
})
</script>

<template>
    <div class="center">
        <n-card :bordered="false" embedded>
            <n-form-item-row v-if="!isMobile" :label="t('mailboxSplitSize')">
                <n-slider v-model:value="mailboxSplitSize" :min="0" :max="0.75" :step="0.01" :marks="{
                    0: '0',
                    0.25: '0.25',
                    0.5: '0.5',
                    0.75: '0.75'
                }" />
            </n-form-item-row>
            <n-form-item-row v-if="!isMobile" :label="t('mailListView')">
                <n-switch v-model:value="mailListView" :round="false" />
            </n-form-item-row>
            <n-form-item-row v-if="!isMobile" :label="t('mailListPreviewLineClamp')">
                <n-slider v-model:value="mailListPreviewLineClamp" :min="0" :max="5" :step="1" :marks="{
                    0: t('off'),
                    1: '1',
                    2: '2',
                    3: '3',
                    4: '4',
                    5: '5'
                }" />
            </n-form-item-row>
            <n-form-item-row :label="t('autoRefreshInterval')">
                <n-slider v-model:value="configAutoRefreshInterval" :min="30" :max="300" :step="1" :marks="{
                    60: '60', 120: '120', 180: '180', 240: '240'
                }" />
            </n-form-item-row>
            <n-form-item-row v-if="props.showUseSimpleIndex" :label="t('useSimpleIndex')">
                <n-switch v-model:value="useSimpleIndex" :round="false" />
            </n-form-item-row>
            <n-form-item-row :label="t('preferShowTextMail')">
                <n-switch v-model:value="preferShowTextMail" :round="false" />
            </n-form-item-row>
            <n-form-item-row :label="t('useIframeShowMail')">
                <n-switch v-model:value="useIframeShowMail" :round="false" />
            </n-form-item-row>
            <n-form-item-row :label="t('useUTCDate')">
                <n-switch v-model:value="useUTCDate" :round="false" />
            </n-form-item-row>
            <n-form-item-row :label="t('autoLoadRemoteImages')">
                <n-switch v-model:value="autoLoadRemoteImages" :round="false" />
            </n-form-item-row>
            <n-form-item-row v-if="!isMobile" :label="t('useSideMargin')">
                <n-switch v-model:value="useSideMargin" :round="false" />
            </n-form-item-row>
            <n-form-item-row :label="t('globalTabplacement')">
                <n-radio-group v-model:value="globalTabplacement">
                    <n-radio-button value="top" :label="t('top')" />
                    <n-radio-button value="left" :label="t('left')" />
                    <n-radio-button value="right" :label="t('right')" />
                    <n-radio-button value="bottom" :label="t('bottom')" />
                </n-radio-group>
            </n-form-item-row>
            <template v-if="props.showHideAboutConfig && canConfigureHideAbout">
                <n-divider />
                <n-form-item-row :label="t('hideAboutTitle')">
                    <n-text depth="3">{{ t('hideAboutDesc') }}</n-text>
                </n-form-item-row>
                <n-form-item-row :label="t('hideAboutMain')">
                    <n-switch
                        :value="openSettings.hideAbout.main"
                        :round="false"
                        :disabled="savingHideAbout"
                        @update:value="(v) => updateHideAbout('main', v)"
                    />
                </n-form-item-row>
                <n-form-item-row :label="t('hideAboutSub')">
                    <n-switch
                        :value="openSettings.hideAbout.sub"
                        :round="false"
                        :disabled="savingHideAbout"
                        @update:value="(v) => updateHideAbout('sub', v)"
                    />
                </n-form-item-row>
                <n-form-item-row :label="t('hideAboutUser')">
                    <n-switch
                        :value="openSettings.hideAbout.user"
                        :round="false"
                        :disabled="savingHideAbout"
                        @update:value="(v) => updateHideAbout('user', v)"
                    />
                </n-form-item-row>
            </template>
        </n-card>
    </div>
</template>

<style scoped>
.center {
    display: flex;
    justify-content: center;
}


.n-card {
    max-width: 800px;
    text-align: left;
}
</style>
