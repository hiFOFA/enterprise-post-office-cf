<script setup>
import { computed } from 'vue'
import { GithubAlt } from '@vicons/fa'
import { useGlobalState } from '../../store'
import { PROJECT_GITHUB_URL } from '../../utils/projectLinks'
import { sanitizeHtml } from '../../utils/sanitize-html'
const { announcement, showAboutLinks } = useGlobalState()
const safeAnnouncement = computed(() => sanitizeHtml(announcement.value))
</script>

<template>
    <div class="center">
        <n-card :bordered="false" embedded>
            <div v-html="safeAnnouncement"></div>
            <n-button v-if="showAboutLinks" tag="a" target="_blank" rel="noopener noreferrer" :href="PROJECT_GITHUB_URL">
                <template #icon>
                    <n-icon :component="GithubAlt" />
                </template>
            </n-button>
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
}

.n-button {
    margin-top: 10px;
    margin-left: 10px;
}
</style>
