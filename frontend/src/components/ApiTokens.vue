<script setup>
import { computed, onMounted, ref } from 'vue'
import { useScopedI18n } from '@/i18n/app'
import { api } from '../api'

const props = defineProps({
  apiPrefix: { type: String, required: true },
})

const { t } = useScopedI18n('components.ApiTokens')
const message = useMessage()

const loading = ref(false)
const saving = ref(false)
const catalog = ref([])
const tokens = ref([])
const name = ref('')
const selected = ref([])
const createdToken = ref('')
const role = ref('user')

const docName = computed(() => ({
  user: 'mailbox-user.md',
  sub: 'sub-admin.md',
  main: 'main-admin.md',
}[role.value] || 'mailbox-user.md'))

const allScopeIds = computed(() => catalog.value.flatMap((group) => (
  [...group.read, ...group.write].map((item) => item.id)
)))

const groupSelected = (group, access) => {
  const ids = group[access].map((item) => item.id)
  return ids.length > 0 && ids.every((id) => selected.value.includes(id))
}

const groupPartial = (group, access) => {
  const ids = group[access].map((item) => item.id)
  const count = ids.filter((id) => selected.value.includes(id)).length
  return count > 0 && count < ids.length
}

const toggleGroup = (group, access, checked) => {
  const ids = group[access].map((item) => item.id)
  if (checked) {
    selected.value = [...new Set([...selected.value, ...ids])]
    return
  }
  selected.value = selected.value.filter((id) => !ids.includes(id))
}

const toggleScope = (id, checked) => {
  if (checked) {
    if (!selected.value.includes(id)) selected.value = [...selected.value, id]
    return
  }
  selected.value = selected.value.filter((item) => item !== id)
}

const load = async () => {
  loading.value = true
  try {
    const [catalogRes, listRes] = await Promise.all([
      api.fetch(`${props.apiPrefix}/catalog`),
      api.fetch(props.apiPrefix),
    ])
    catalog.value = catalogRes.catalog || []
    role.value = catalogRes.role || 'user'
    tokens.value = listRes.results || []
    if (selected.value.length === 0) selected.value = allScopeIds.value
  } catch (error) {
    message.error((error && error.message) || t('loadFailed'))
  } finally {
    loading.value = false
  }
}

const createToken = async () => {
  if (!name.value.trim()) {
    message.warning(t('nameRequired'))
    return
  }
  if (!selected.value.length) {
    message.warning(t('needScope'))
    return
  }
  saving.value = true
  try {
    const allSelected = allScopeIds.value.length > 0
      && allScopeIds.value.every((id) => selected.value.includes(id))
    const res = await api.fetch(props.apiPrefix, {
      method: 'POST',
      body: JSON.stringify({
        name: name.value.trim(),
        scopes: allSelected ? [] : selected.value,
      }),
    })
    createdToken.value = res.token || ''
    name.value = ''
    selected.value = allScopeIds.value
    await load()
  } catch (error) {
    message.error((error && error.message) || t('saveFailed'))
  } finally {
    saving.value = false
  }
}

const revokeToken = async (row) => {
  try {
    await api.fetch(`${props.apiPrefix}/${row.id}`, { method: 'DELETE' })
    tokens.value = tokens.value.filter((item) => item.id !== row.id)
  } catch (error) {
    message.error((error && error.message) || t('saveFailed'))
  }
}

const downloadDoc = async () => {
  try {
    const res = await fetch(`/api-docs/${docName.value}`)
    if (!res.ok) throw new Error('missing')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = docName.value
    link.click()
    URL.revokeObjectURL(url)
  } catch {
    message.error(t('downloadFailed'))
  }
}

const copyToken = async () => {
  if (!createdToken.value) return
  try {
    await navigator.clipboard.writeText(createdToken.value)
    message.success(t('copied'))
  } catch {
    message.error(t('saveFailed'))
  }
}

onMounted(load)
</script>

<template>
  <section class="token-page">
    <header class="token-head">
      <div>
        <h3>{{ t('title') }}</h3>
        <p>{{ t('hint') }}</p>
      </div>
      <n-button size="small" tertiary @click="downloadDoc">
        {{ t('downloadDoc') }}
      </n-button>
    </header>

    <div class="advisor-pane">
      <n-input v-model:value="name" size="small" :placeholder="t('name')" />
      <div v-for="group in catalog" :key="group.id" class="token-group">
        <div class="token-group__head">
          <strong>{{ t(`category.${group.id}`) }}</strong>
          <div class="token-group__toggles">
            <n-checkbox
              v-if="group.read.length"
              :checked="groupSelected(group, 'read')"
              :indeterminate="groupPartial(group, 'read')"
              @update:checked="(checked) => toggleGroup(group, 'read', checked)"
            >
              {{ t('read') }}
            </n-checkbox>
            <n-checkbox
              v-if="group.write.length"
              :checked="groupSelected(group, 'write')"
              :indeterminate="groupPartial(group, 'write')"
              @update:checked="(checked) => toggleGroup(group, 'write', checked)"
            >
              {{ t('write') }}
            </n-checkbox>
          </div>
        </div>
        <n-collapse>
          <n-collapse-item :title="t('details')" :name="group.id">
            <div class="token-scopes">
              <n-checkbox
                v-for="item in [...group.read, ...group.write]"
                :key="item.id"
                :checked="selected.includes(item.id)"
                @update:checked="(checked) => toggleScope(item.id, checked)"
              >
                {{ t(`scope.${item.id}`) }}
              </n-checkbox>
            </div>
          </n-collapse-item>
        </n-collapse>
      </div>
      <div class="token-actions">
        <n-button type="primary" size="small" :loading="saving || loading" @click="createToken">
          {{ t('create') }}
        </n-button>
      </div>
      <n-alert v-if="createdToken" type="success" :bordered="false">
        <p>{{ t('created') }}</p>
        <div class="token-secret">
          <code>{{ t('usage') }} {{ createdToken }}</code>
          <n-button size="tiny" @click="copyToken">{{ t('copy') }}</n-button>
        </div>
      </n-alert>
    </div>

    <div class="advisor-pane">
      <n-empty v-if="!tokens.length" size="small" :description="t('empty')" />
      <div v-for="row in tokens" :key="row.id" class="token-row">
        <div>
          <strong>{{ row.name }}</strong>
          <p>
            {{ t('prefix') }} {{ row.prefix }}
            · {{ t('createdAt') }} {{ row.created_at }}
            · {{ row.last_used_at ? `${t('lastUsed')} ${row.last_used_at}` : t('neverUsed') }}
          </p>
        </div>
        <n-popconfirm @positive-click="revokeToken(row)">
          <template #trigger>
            <n-button size="tiny" tertiary type="error">{{ t('revoke') }}</n-button>
          </template>
          {{ t('revokeConfirm') }}
        </n-popconfirm>
      </div>
    </div>
  </section>
</template>

<style scoped>
.token-page {
  display: grid;
  gap: 12px;
  max-width: 880px;
  margin: 0 auto;
  padding: 8px 12px 24px;
}
.token-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.token-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 650;
}
.token-head p {
  margin: 4px 0 0;
  color: var(--n-text-color-3);
  font-size: 12px;
  line-height: 1.5;
}
.advisor-pane {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--n-border-color);
  border-radius: 10px;
  background: var(--n-color);
}
.token-group {
  display: grid;
  gap: 6px;
  padding: 8px 0;
  border-top: 1px solid var(--n-border-color);
}
.token-group__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.token-group__toggles,
.token-scopes,
.token-actions,
.token-secret {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}
.token-scopes {
  display: grid;
}
.token-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}
.token-row p,
.token-secret code {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--n-text-color-3);
  word-break: break-all;
}
</style>
