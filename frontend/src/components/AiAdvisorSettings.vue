<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useScopedI18n } from '@/i18n/app'
import { api } from '../api'

const props = defineProps({
  apiPrefix: { type: String, required: true },
  showPolicy: { type: Boolean, default: false },
  panel: {
    type: String,
    default: 'all',
  },
})

const showDriver = computed(() => props.panel !== 'policy')
const showPolicyPanel = computed(() => props.showPolicy && props.panel !== 'driver')

const emit = defineEmits(['update:driver'])

const { t } = useScopedI18n('components.AiAdvisor')
const message = useMessage()

const cfAllowed = ref(true)
const catalog = ref([])
const models = ref([])
const provider = ref('cf')
const cfModel = ref('')
const format = ref('openai')
const baseUrl = ref('https://api.openai.com/v1')
const modelId = ref('')
const apiKey = ref('')
const hasKey = ref(false)
const apiKeyMasked = ref('')
const savingDriver = ref(false)
const testing = ref(false)
const testResult = ref(null)

const policyUserEnable = ref(true)
const policyUserModels = ref([])
const policySubEnable = ref(true)
const policySubModels = ref([])
const policyCatalog = ref([])
const subTarget = ref('default')
const subAdmins = ref([])
const subById = ref({})
const subDefault = ref({ enableCf: true, models: [] })
const inherited = ref(true)
const savingPolicy = ref(false)

const currentModels = computed(() => (
  props.showPolicy ? policyCatalog.value : catalog.value
))

const chatModels = computed(() => models.value)

const subOptions = computed(() => ([
  { label: t('subDefault'), value: 'default' },
  ...subAdmins.value.map((row) => ({
    label: row.inherited ? `${row.username} · ${t('subInherited')}` : row.username,
    value: String(row.id),
  })),
]))

const providerKind = computed(() => (
  provider.value === 'cf' ? 'cf' : format.value
))

const selectedChatModel = computed(() => (
  provider.value === 'cf' ? cfModel.value : modelId.value
))

const emitDriver = () => {
  emit('update:driver', {
    provider: providerKind.value,
    model: selectedChatModel.value,
    cfAllowed: cfAllowed.value,
    models: chatModels.value,
    hasKey: hasKey.value,
  })
}

const checkedFromAccess = (access, allIds) => {
  if (!access || !Array.isArray(access.models) || access.models.length === 0) return [...allIds]
  return allIds.filter((id) => access.models.includes(id))
}

const accessFromChecked = (enableCf, checked, allIds) => {
  const unique = [...new Set(checked)]
  const allSelected = unique.length === allIds.length && allIds.every((id) => unique.includes(id))
  return {
    enableCf: Boolean(enableCf),
    models: allSelected ? [] : unique,
  }
}

const applySubTarget = () => {
  const allIds = policyCatalog.value.map((row) => row.id)
  if (subTarget.value === 'default') {
    inherited.value = false
    policySubEnable.value = subDefault.value.enableCf !== false
    policySubModels.value = checkedFromAccess(subDefault.value, allIds)
    return
  }
  const override = subById.value[subTarget.value]
  inherited.value = !override
  const access = override || subDefault.value
  policySubEnable.value = access.enableCf !== false
  policySubModels.value = checkedFromAccess(access, allIds)
}

const loadModels = async () => {
  const res = await api.fetch(`${props.apiPrefix}/models`)
  cfAllowed.value = res.cfAllowed !== false
  catalog.value = res.catalog || res.models || []
  models.value = res.models || []
  const saved = res.provider || {}
  provider.value = saved.provider === 'openai' || saved.provider === 'claude' ? 'custom' : 'cf'
  format.value = saved.provider === 'claude' ? 'claude' : 'openai'
  cfModel.value = saved.cfModel || (models.value[0] && models.value[0].id) || ''
  baseUrl.value = saved.baseUrl || (format.value === 'claude' ? 'https://api.anthropic.com' : 'https://api.openai.com/v1')
  modelId.value = saved.modelId || ''
  hasKey.value = Boolean(saved.hasKey)
  apiKeyMasked.value = saved.apiKeyMasked || ''
  apiKey.value = ''
  if (!cfAllowed.value && provider.value === 'cf') provider.value = 'custom'
  emitDriver()
}

const loadPolicy = async () => {
  if (!props.showPolicy) return
  const res = await api.fetch(`${props.apiPrefix}/policy`)
  policyCatalog.value = res.catalog || []
  const allIds = policyCatalog.value.map((row) => row.id)
  policyUserEnable.value = res.user?.enableCf !== false
  policyUserModels.value = checkedFromAccess(res.user, allIds)
  subDefault.value = res.subDefault || { enableCf: true, models: [] }
  subById.value = res.subById || {}
  subAdmins.value = res.subAdmins || []
  applySubTarget()
}

const onProviderUpdate = (value) => {
  if (value === 'cf' && !cfAllowed.value) {
    message.warning(t('contactAdmin'))
    return
  }
  provider.value = value
  if (value === 'custom' && !baseUrl.value) {
    baseUrl.value = format.value === 'claude' ? 'https://api.anthropic.com' : 'https://api.openai.com/v1'
  }
  emitDriver()
}

const onFormatUpdate = (value) => {
  format.value = value
  if (!baseUrl.value || baseUrl.value === 'https://api.openai.com/v1' || baseUrl.value === 'https://api.anthropic.com') {
    baseUrl.value = value === 'claude' ? 'https://api.anthropic.com' : 'https://api.openai.com/v1'
  }
  emitDriver()
}

const saveDriver = async () => {
  savingDriver.value = true
  try {
    const body = {
      provider: providerKind.value,
      cfModel: cfModel.value,
      baseUrl: baseUrl.value,
      modelId: modelId.value,
    }
    if (apiKey.value.trim()) body.apiKey = apiKey.value.trim()
    const res = await api.fetch(`${props.apiPrefix}/provider`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    hasKey.value = Boolean(res.provider?.hasKey)
    apiKeyMasked.value = res.provider?.apiKeyMasked || ''
    apiKey.value = ''
    message.success(t('driverSaved'))
    emitDriver()
  } catch (error) {
    message.error((error && error.message) || t('saveFailed'))
  } finally {
    savingDriver.value = false
  }
}

const runTest = async () => {
  testing.value = true
  testResult.value = null
  try {
    const body = {
      provider: providerKind.value,
      model: cfModel.value,
      baseUrl: baseUrl.value,
      modelId: modelId.value,
    }
    if (apiKey.value.trim()) body.apiKey = apiKey.value.trim()
    const res = await api.fetch(`${props.apiPrefix}/test`, {
      method: 'POST',
      body: JSON.stringify(body),
      timeout: 45000,
    })
    testResult.value = res
  } catch (error) {
    testResult.value = {
      ok: false,
      status: 0,
      output: '',
      error: (error && error.message) || t('chatFailed'),
      first_token_ms: null,
      total_ms: 0,
    }
  } finally {
    testing.value = false
  }
}

const savePolicy = async () => {
  savingPolicy.value = true
  try {
    const allIds = policyCatalog.value.map((row) => row.id)
    const payload = {
      user: accessFromChecked(policyUserEnable.value, policyUserModels.value, allIds),
    }
    const subAccess = accessFromChecked(policySubEnable.value, policySubModels.value, allIds)
    if (subTarget.value === 'default') payload.subDefault = subAccess
    else {
      payload.subId = subTarget.value
      payload.subAccess = subAccess
    }
    const res = await api.fetch(`${props.apiPrefix}/policy`, {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    subDefault.value = res.subDefault || subDefault.value
    subById.value = res.subById || {}
    subAdmins.value = res.subAdmins || []
    applySubTarget()
    message.success(t('policySaved'))
    await loadModels()
  } catch (error) {
    message.error((error && error.message) || t('saveFailed'))
  } finally {
    savingPolicy.value = false
  }
}

const restoreInherit = async () => {
  if (subTarget.value === 'default') return
  savingPolicy.value = true
  try {
    const res = await api.fetch(`${props.apiPrefix}/policy`, {
      method: 'POST',
      body: JSON.stringify({ clearSubId: subTarget.value }),
    })
    subDefault.value = res.subDefault || subDefault.value
    subById.value = res.subById || {}
    subAdmins.value = res.subAdmins || []
    applySubTarget()
    message.success(t('policySaved'))
    await loadModels()
  } catch (error) {
    message.error((error && error.message) || t('saveFailed'))
  } finally {
    savingPolicy.value = false
  }
}

watch(subTarget, applySubTarget)
watch([cfModel, modelId, provider, format], emitDriver)

onMounted(async () => {
  if (showDriver.value) await loadModels()
  if (showPolicyPanel.value) await loadPolicy()
})

defineExpose({ reload: loadModels })
</script>

<template>
  <section class="advisor-pane advisor-settings">
    <header class="advisor-head">
      <div>
        <h3>{{ showDriver && !showPolicyPanel ? t('driverTitle') : t('settingsTitle') }}</h3>
        <p>{{ showPolicyPanel && !showDriver ? t('policyHint') : t('driverHint') }}</p>
      </div>
    </header>

    <div v-if="showPolicyPanel" class="policy-grid">
      <div class="policy-card">
        <div class="policy-card__head">
          <strong>{{ t('subAdmins') }}</strong>
          <n-tag v-if="inherited && subTarget !== 'default'" size="small" :bordered="false">
            {{ t('subInherited') }}
          </n-tag>
        </div>
        <n-select v-model:value="subTarget" :options="subOptions" size="small" />
        <div class="switch-row">
          <n-switch v-model:value="policySubEnable" :round="false" />
          <span>{{ t('enableCf') }}</span>
        </div>
        <p class="field-label">{{ t('allowedModels') }}</p>
        <n-checkbox-group v-model:value="policySubModels" class="model-checks">
          <n-checkbox v-for="item in currentModels" :key="item.id" :value="item.id" :disabled="!policySubEnable">
            {{ item.label }}
          </n-checkbox>
        </n-checkbox-group>
        <div class="advisor-actions">
          <n-button
            v-if="subTarget !== 'default'"
            size="small"
            tertiary
            :disabled="inherited"
            :loading="savingPolicy"
            @click="restoreInherit"
          >
            {{ t('subRestore') }}
          </n-button>
          <n-button size="small" type="primary" :loading="savingPolicy" @click="savePolicy">
            {{ t('savePolicy') }}
          </n-button>
        </div>
      </div>

      <div class="policy-card">
        <div class="policy-card__head">
          <strong>{{ t('users') }}</strong>
        </div>
        <div class="switch-row">
          <n-switch v-model:value="policyUserEnable" :round="false" />
          <span>{{ t('enableCf') }}</span>
        </div>
        <p class="field-label">{{ t('allowedModels') }}</p>
        <n-checkbox-group v-model:value="policyUserModels" class="model-checks">
          <n-checkbox v-for="item in currentModels" :key="'u-' + item.id" :value="item.id" :disabled="!policyUserEnable">
            {{ item.label }}
          </n-checkbox>
        </n-checkbox-group>
        <div class="advisor-actions">
          <n-button size="small" type="primary" :loading="savingPolicy" @click="savePolicy">
            {{ t('savePolicy') }}
          </n-button>
        </div>
      </div>
    </div>
    <p v-if="showPolicyPanel" class="field-label">{{ t('policyOwnDriver') }}</p>

    <div v-if="showDriver" class="driver-card">
      <p class="field-label">{{ t('driverPick') }}</p>
      <div class="driver-pick" role="radiogroup" :aria-label="t('driverPick')">
        <button
          type="button"
          class="driver-option"
          :class="{ 'is-active': provider === 'cf', 'is-locked': !cfAllowed }"
          role="radio"
          :aria-checked="provider === 'cf'"
          :aria-disabled="!cfAllowed"
          @click="onProviderUpdate('cf')"
        >
          <span class="driver-option__top">
            <strong>{{ t('driverCf') }}</strong>
            <n-tag v-if="provider === 'cf'" size="small" type="success" :bordered="false">
              {{ t('driverUsing') }}
            </n-tag>
          </span>
          <span>{{ cfAllowed ? t('driverCfDesc') : t('contactAdmin') }}</span>
        </button>
        <button
          type="button"
          class="driver-option"
          :class="{ 'is-active': provider === 'custom' }"
          role="radio"
          :aria-checked="provider === 'custom'"
          @click="onProviderUpdate('custom')"
        >
          <span class="driver-option__top">
            <strong>{{ t('driverCustom') }}</strong>
            <n-tag v-if="provider === 'custom'" size="small" type="success" :bordered="false">
              {{ t('driverUsing') }}
            </n-tag>
          </span>
          <span>{{ t('driverCustomDesc') }}</span>
        </button>
      </div>

      <div v-if="provider === 'cf'" class="driver-cf">
        <n-select
          v-model:value="cfModel"
          size="small"
          filterable
          :options="chatModels.map((item) => ({ label: item.label, value: item.id }))"
          :placeholder="t('modelSelect')"
        />
      </div>

      <div v-else class="driver-custom">
        <p>{{ t('customHint') }}</p>
        <n-radio-group :value="format" size="small" @update:value="onFormatUpdate">
          <n-radio value="openai">{{ t('formatOpenAi') }}</n-radio>
          <n-radio value="claude">{{ t('formatClaude') }}</n-radio>
        </n-radio-group>
        <n-input v-model:value="baseUrl" size="small" :placeholder="t('baseUrl')" />
        <n-input v-model:value="modelId" size="small" :placeholder="t('modelId')" />
        <n-input
          v-model:value="apiKey"
          size="small"
          type="password"
          show-password-on="click"
          :placeholder="hasKey ? t('apiKeyKept') : t('apiKey')"
        />
        <p v-if="hasKey && apiKeyMasked" class="test-hint">{{ apiKeyMasked }}</p>
      </div>

      <p class="test-hint">{{ t('testHint') }}</p>
      <div class="advisor-actions">
        <n-button size="small" :loading="testing" @click="runTest">{{ t('test') }}</n-button>
        <n-button size="small" type="primary" :loading="savingDriver" @click="saveDriver">
          {{ t('saveDriver') }}
        </n-button>
      </div>
      <div v-if="testResult" class="test-result" :class="testResult.ok ? 'is-ok' : 'is-bad'">
        <div class="test-meta">
          <span>{{ t('testStatus', { status: testResult.status }) }}</span>
          <span v-if="testResult.first_token_ms != null">{{ t('firstToken', { ms: testResult.first_token_ms }) }}</span>
          <span>{{ t('totalTime', { ms: testResult.total_ms }) }}</span>
        </div>
        <pre>{{ testResult.ok ? testResult.output : testResult.error }}</pre>
      </div>
    </div>
  </section>
</template>

<style scoped>
.advisor-settings {
  margin-top: 0;
}
.policy-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.policy-card,
.driver-card {
  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
}
.policy-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.switch-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.advisor-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}
.field-label {
  margin: 0;
  font-size: 12px;
  color: var(--n-text-color-3);
}
.model-checks {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 6px 10px;
  max-height: 220px;
  overflow: auto;
  padding: 4px 0;
}
.driver-pick {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.driver-option {
  display: grid;
  gap: 6px;
  min-height: 72px;
  padding: 12px;
  text-align: left;
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
  background: var(--n-color);
  color: inherit;
  cursor: pointer;
  font: inherit;
}
.driver-option:focus-visible {
  outline: 2px solid #18a058;
  outline-offset: 2px;
}
.driver-option.is-active {
  border-color: #18a058;
  background: rgba(24, 160, 88, 0.1);
}
.driver-option.is-locked {
  opacity: 0.55;
  cursor: not-allowed;
}
.driver-option__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.driver-option span:last-child {
  font-size: 12px;
  line-height: 1.5;
  color: var(--n-text-color-3);
}
.driver-custom,
.driver-cf {
  display: grid;
  gap: 8px;
}
.driver-custom p,
.test-hint {
  margin: 0;
  font-size: 12px;
  color: var(--n-text-color-3);
  line-height: 1.5;
}
.test-result {
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--n-color-embedded);
}
.test-result.is-ok { border-left: 3px solid #18a058; }
.test-result.is-bad { border-left: 3px solid #d03050; }
.test-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.test-result pre {
  margin: 8px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 12px;
  line-height: 1.5;
  font-family: inherit;
}
@media (max-width: 860px) {
  .policy-grid,
  .driver-pick { grid-template-columns: 1fr; }
}
</style>
