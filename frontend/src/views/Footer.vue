<script setup>
import { computed } from 'vue'
import { useScopedI18n } from '@/i18n/app'
import { useGlobalState } from '../store'
import DOMPurify from 'dompurify'
const { openSettings } = useGlobalState()


const { t } = useScopedI18n('views.Footer')
const copyrightHtml = computed(() => openSettings.value.copyright || t('copyright'))

</script>

<template>
    <div>
        <n-divider class="footer-divider" />
        <div style="text-align: center; padding: 20px">
            <n-space justify="center">
                <n-text depth="3">
                    <div v-html="DOMPurify.sanitize(copyrightHtml)"></div>
                </n-text>
            </n-space>
        </div>
    </div>
</template>


<style scoped>
.footer-divider {
    margin: 0;
    padding: 0 var(--x-padding);
}
</style>
