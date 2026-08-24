<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import { useScopedI18n } from '@/i18n/app'
import { api } from '../api'
import { useGlobalState } from '../store'
import { decodeJwtPayload, LOCAL_ADDRESS_CACHE_KEY } from '../utils'
import AiAdvisorSettings from './AiAdvisorSettings.vue'

const props = defineProps({
  mode: {
    type: String,
    default: 'user',
  },
})

const isAdmin = computed(() => props.mode === 'admin')
const { t } = useScopedI18n('components.AiAdvisor')
const message = useMessage()
const { jwt, loading, adminRole } = useGlobalState()
const localAddressCache = useLocalStorage(LOCAL_ADDRESS_CACHE_KEY, [])

const aiBound = ref(true)
const groups = ref([])
const checkedKeys = ref([])
const selected = ref([])
const localChecked = ref([])
const messages = ref([])
const draft = ref('')
const sending = ref(false)
const saving = ref(false)
const treeFilter = ref('')
const localFilter = ref('')
const threadEl = ref(null)
const isMainAdmin = computed(() => isAdmin.value && adminRole.value === 'main')
const apiPrefix = computed(() => (isAdmin.value ? '/admin/ai_advisor' : '/api/ai_advisor'))
const driver = ref({
  provider: 'cf',
  model: '',
  cfAllowed: true,
  models: [],
  hasKey: false,
})
const chatModel = ref('')

const localMailboxes = computed(() => {
  const tokens = [...localAddressCache.value]
  if (typeof jwt.value === 'string' && jwt.value && !tokens.includes(jwt.value)) {
    tokens.unshift(jwt.value)
  }
  const seen = new Set()
  return tokens.map((token) => {
    const payload = decodeJwtPayload(token)
    const address = payload && typeof payload.address === 'string' ? payload.address : ''
    return { jwt: token, address, valid: Boolean(address) }
  }).filter((row) => {
    if (!row.valid || seen.has(row.address)) return false
    seen.add(row.address)
    return true
  })
})

const visibleLocalMailboxes = computed(() => {
  const keyword = localFilter.value.trim().toLowerCase()
  if (!keyword) return localMailboxes.value
  return localMailboxes.value.filter((row) => row.address.toLowerCase().includes(keyword))
})

const treeData = computed(() => groups.value.map((group) => ({
  key: group.key,
  label: `${group.label} (${group.addresses.length})`,
  children: group.addresses.map((item) => ({
    key: `addr:${item.name}`,
    label: `${item.name}  ·  ${item.mail_count}`,
    address: item.name,
  })),
})))

const authorizedCount = computed(() => (
  isAdmin.value ? selected.value.length : localChecked.value.length
))

const chatModelOptions = computed(() => {
  if (driver.value.provider === 'cf') {
    return (driver.value.models || []).map((item) => ({ label: item.label, value: item.id }))
  }
  if (driver.value.model) {
    return [{ label: driver.value.model, value: driver.value.model }]
  }
  return []
})

const onDriverUpdate = (next) => {
  driver.value = next
  if (next.model && (next.provider !== 'cf' || chatModelOptions.value.some((item) => item.value === next.model))) {
    chatModel.value = next.model
  } else if (chatModelOptions.value.length) {
    chatModel.value = chatModelOptions.value[0].value
  }
}

const addressKeysFromChecked = (keys) => keys
  .filter((key) => typeof key === 'string' && key.startsWith('addr:'))
  .map((key) => key.slice(5))

const scrollThread = async () => {
  await nextTick()
  const el = threadEl.value
  if (el) el.scrollTop = el.scrollHeight
}

const applySelectedToTree = (addresses) => {
  selected.value = addresses
  checkedKeys.value = addresses.map((name) => `addr:${name}`)
}

const fetchAdminMailboxes = async () => {
  const res = await api.fetch('/admin/ai_advisor/mailboxes')
  aiBound.value = res.aiBound !== false
  groups.value = res.groups || []
  applySelectedToTree(res.selected || [])
}

const fetchUserAuth = async () => {
  const res = await api.fetch('/api/ai_advisor/auth')
  aiBound.value = res.aiBound !== false
  const allowed = new Set(res.selected || [])
  const localNames = localMailboxes.value.map((row) => row.address)
  localChecked.value = localNames.filter((name) => allowed.has(name))
  if (localChecked.value.length === 0 && jwt.value) {
    const current = decodeJwtPayload(jwt.value)
    if (current?.address) localChecked.value = [String(current.address)]
  }
}

const fetchMessages = async () => {
  const path = isAdmin.value ? '/admin/ai_advisor/messages' : '/api/ai_advisor/messages'
  const res = await api.fetch(path)
  aiBound.value = res.aiBound !== false
  messages.value = res.results || []
  await scrollThread()
}

const persistAuth = async () => {
  if (isAdmin.value) {
    const addresses = addressKeysFromChecked(checkedKeys.value)
    const res = await api.fetch('/admin/ai_advisor/auth', {
      method: 'POST',
      body: JSON.stringify({ addresses }),
    })
    applySelectedToTree(res.selected || addresses)
    return
  }
  const chosen = new Set(localChecked.value)
  const credentials = localMailboxes.value
    .filter((row) => chosen.has(row.address))
    .map((row) => row.jwt)
  const res = await api.fetch('/api/ai_advisor/auth', {
    method: 'POST',
    body: JSON.stringify({
      addresses: [...chosen],
      credentials,
    }),
  })
  localChecked.value = res.selected || [...chosen]
}

const saveAuth = async () => {
  saving.value = true
  try {
    await persistAuth()
    message.success(t('saved'))
  } catch (error) {
    message.error((error && error.message) || t('saveFailed'))
  } finally {
    saving.value = false
  }
}

const selectAllVisible = () => {
  if (isAdmin.value) {
    const keys = []
    for (const group of groups.value) {
      keys.push(group.key)
      for (const item of group.addresses) keys.push(`addr:${item.name}`)
    }
    checkedKeys.value = keys
    return
  }
  localChecked.value = visibleLocalMailboxes.value.map((row) => row.address)
}

const clearVisible = () => {
  if (isAdmin.value) checkedKeys.value = []
  else localChecked.value = []
}

const sendChat = async () => {
  const text = draft.value.trim()
  if (!text || sending.value) return
  if (!aiBound.value && driver.value.provider === 'cf') {
    message.warning(t('aiMissing'))
    return
  }
  if (driver.value.provider === 'cf' && !driver.value.cfAllowed) {
    message.warning(t('contactAdmin'))
    return
  }
  if (driver.value.provider !== 'cf' && (!driver.value.model || !driver.value.hasKey)) {
    message.warning(t('needCustom'))
    return
  }
  sending.value = true
  messages.value = [...messages.value, { role: 'user', content: text }]
  draft.value = ''
  await scrollThread()
  try {
    const path = isAdmin.value ? '/admin/ai_advisor/chat' : '/api/ai_advisor/chat'
    const res = await api.fetch(path, {
      method: 'POST',
      body: JSON.stringify({
        message: text,
        provider: driver.value.provider,
        model: chatModel.value || driver.value.model,
      }),
    })
    messages.value = [...messages.value, { role: 'assistant', content: res.reply || '' }]
  } catch (error) {
    messages.value = [...messages.value, {
      role: 'assistant',
      content: (error && error.message) || t('chatFailed'),
    }]
  } finally {
    sending.value = false
    await scrollThread()
  }
}

const onDraftKeydown = (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    sendChat()
  }
}

const clearChat = async () => {
  try {
    const path = isAdmin.value ? '/admin/ai_advisor/messages' : '/api/ai_advisor/messages'
    await api.fetch(path, { method: 'DELETE' })
    messages.value = []
    message.success(t('chatCleared'))
  } catch (error) {
    message.error((error && error.message) || t('chatFailed'))
  }
}

const innerTab = ref('auth')

onMounted(async () => {
  try {
    if (isAdmin.value) await fetchAdminMailboxes()
    else await fetchUserAuth()
    await fetchMessages()
  } catch (error) {
    message.error((error && error.message) || t('loadFailed'))
  }
})

watch(jwt, async () => {
  if (isAdmin.value) return
  try {
    await fetchUserAuth()
  } catch {
    // keep current selection
  }
})
</script>

<template>
  <div class="advisor">
    <n-alert v-if="!aiBound" type="warning" :bordered="false" class="advisor-banner">
      {{ t('aiMissing') }}
    </n-alert>
    <n-tabs type="bar" justify-content="center" v-model:value="innerTab">
      <n-tab-pane name="auth" :tab="t('authTitle')" display-directive="show">
        <section class="advisor-pane">
          <header class="advisor-head">
            <div>
              <h3>{{ t('authTitle') }}</h3>
              <p>{{ isAdmin ? t('authHintAdmin') : t('authHintUser') }}</p>
            </div>
            <n-tag size="small" :bordered="false">
              {{ t('authorizedCount', { count: authorizedCount }) }}
            </n-tag>
          </header>

          <n-input
            v-if="isAdmin"
            v-model:value="treeFilter"
            size="small"
            clearable
            :placeholder="t('searchMailbox')"
          />
          <n-input
            v-else
            v-model:value="localFilter"
            size="small"
            clearable
            :placeholder="t('searchMailbox')"
          />

          <div v-if="isAdmin" class="advisor-tree">
            <n-tree
              v-if="treeData.length"
              block-line
              checkable
              cascade
              virtual-scroll
              :selectable="false"
              :data="treeData"
              :pattern="treeFilter"
              :checked-keys="checkedKeys"
              :show-irrelevant-nodes="false"
              style="height: 360px"
              @update:checked-keys="(keys) => { checkedKeys = keys }"
            />
            <n-empty v-else size="small" :description="t('emptyMailboxes')" />
          </div>
          <div v-else class="advisor-local">
            <n-checkbox-group v-model:value="localChecked" class="advisor-checks">
              <n-checkbox
                v-for="row in visibleLocalMailboxes"
                :key="row.address"
                :value="row.address"
              >
                {{ row.address }}
              </n-checkbox>
            </n-checkbox-group>
            <n-empty v-if="visibleLocalMailboxes.length === 0" size="small" :description="t('emptyLocal')" />
          </div>

          <footer class="advisor-actions">
            <n-button size="small" tertiary @click="selectAllVisible">{{ t('selectAll') }}</n-button>
            <n-button size="small" tertiary @click="clearVisible">{{ t('clearAll') }}</n-button>
            <n-button size="small" type="primary" :loading="saving || loading" @click="saveAuth">
              {{ t('saveAuth') }}
            </n-button>
          </footer>
        </section>
      </n-tab-pane>

      <n-tab-pane name="chat" :tab="t('chatTitle')" display-directive="show">
        <section class="advisor-pane advisor-chat">
          <header class="advisor-head">
            <div>
              <h3>{{ t('chatTitle') }}</h3>
              <p>{{ t('chatHint') }}</p>
            </div>
            <div class="chat-tools">
              <n-select
                v-model:value="chatModel"
                size="tiny"
                filterable
                :options="chatModelOptions"
                :placeholder="t('modelSelect')"
                style="min-width: 180px"
              />
              <n-button size="tiny" quaternary @click="clearChat">{{ t('clearChat') }}</n-button>
            </div>
          </header>

          <div ref="threadEl" class="advisor-thread">
            <div v-if="messages.length === 0" class="advisor-empty">
              {{ t('chatEmpty') }}
            </div>
            <article
              v-for="(item, index) in messages"
              :key="index"
              class="advisor-bubble"
              :class="item.role === 'user' ? 'is-user' : 'is-bot'"
            >
              <span class="advisor-role">{{ item.role === 'user' ? t('you') : t('advisor') }}</span>
              <pre>{{ item.content }}</pre>
            </article>
          </div>

          <div class="advisor-composer">
            <n-input
              v-model:value="draft"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 5 }"
              :placeholder="t('chatPlaceholder')"
              :disabled="sending"
              @keydown="onDraftKeydown"
            />
            <n-button type="primary" :loading="sending" :disabled="!draft.trim()" @click="sendChat">
              {{ t('send') }}
            </n-button>
          </div>
        </section>
      </n-tab-pane>

      <n-tab-pane name="driver" :tab="t('driverTitle')" display-directive="show">
        <AiAdvisorSettings
          :api-prefix="apiPrefix"
          :show-policy="false"
          panel="driver"
          @update:driver="onDriverUpdate"
        />
      </n-tab-pane>

      <n-tab-pane name="settings" :tab="t('settingsTitle')" display-directive="show">
        <AiAdvisorSettings
          v-if="isMainAdmin"
          :api-prefix="apiPrefix"
          :show-policy="true"
          panel="policy"
        />
        <n-alert v-else type="info" :bordered="false">
          {{ t('contactAdmin') }}
        </n-alert>
      </n-tab-pane>
    </n-tabs>
  </div>
</template>

<style scoped>
.advisor {
  max-width: 1120px;
  margin: 0 auto;
  padding: 8px 12px 24px;
}
.advisor-banner { margin-bottom: 12px; }
.advisor-pane {
  display: grid;
  gap: 10px;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  background: var(--n-color);
}
.advisor-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.advisor-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
}
.advisor-head p {
  margin: 4px 0 0;
  color: var(--n-text-color-3);
  font-size: 12px;
  line-height: 1.5;
}
.advisor-tree,
.advisor-local {
  min-height: 220px;
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  padding: 8px;
  overflow: auto;
}
.advisor-checks { display: grid; gap: 8px; }
.advisor-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}
.advisor-chat {
  grid-template-rows: auto 1fr auto;
  min-height: 520px;
}
.advisor-thread {
  min-height: 280px;
  max-height: 420px;
  overflow: auto;
  display: grid;
  align-content: start;
  gap: 10px;
  padding: 8px 2px;
}
.advisor-empty {
  color: var(--n-text-color-3);
  font-size: 13px;
  padding: 24px 8px;
}
.advisor-bubble {
  max-width: 92%;
  padding: 8px 10px;
  border-radius: 10px;
}
.advisor-bubble pre {
  margin: 4px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.55;
}
.advisor-role {
  font-size: 11px;
  font-weight: 650;
  opacity: 0.7;
}
.is-user {
  justify-self: end;
  background: rgba(24, 160, 88, 0.14);
}
.is-bot {
  justify-self: start;
  background: var(--n-color-embedded);
}
.advisor-composer {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: end;
}
.chat-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}
@media (max-width: 860px) {
  .advisor-chat { min-height: 420px; }
}
</style>
