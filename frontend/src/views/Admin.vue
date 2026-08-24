<script setup>
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue';
import { useScopedI18n } from '@/i18n/app'
import { useRouter } from 'vue-router'

import { useGlobalState } from '../store'
import { api } from '../api'
import { getRouterPathWithLang } from '../utils'
import UsageGuide from '../components/UsageGuide.vue'

import SenderAccess from './admin/SenderAccess.vue'
import Statistics from "./admin/Statistics.vue"
import SendBox from './admin/SendBox.vue';
import Account from './admin/Account.vue';
import CreateAccount from './admin/CreateAccount.vue';
import AddressGroups from './admin/AddressGroups.vue';
import AccountSettings from './admin/AccountSettings.vue';
import Mails from './admin/Mails.vue';
import MailsUnknow from './admin/MailsUnknow.vue';
import About from './common/About.vue';
import Maintenance from './admin/Maintenance.vue';
import DatabaseManager from './admin/DatabaseManager.vue';
import Appearance from './common/Appearance.vue';
import Telegram from './admin/Telegram.vue';
import Webhook from './admin/Webhook.vue';
import MailWebhook from './admin/MailWebhook.vue';
import WorkerConfig from './admin/WorkerConfig.vue';
import IpBlacklistSettings from './admin/IpBlacklistSettings.vue';
import AiExtractSettings from './admin/AiExtractSettings.vue';
import ApiTokens from '../components/ApiTokens.vue';
import SubAdmins from './admin/SubAdmins.vue';
import DomainCreateCosts from './admin/DomainCreateCosts.vue';

const {
  adminTab, adminMailsSubTab, loading,
  globalTabplacement, showAdminPage,
  openSettings, adminUsername, isMainAdmin, isSubAdmin,
  isAdminAuthValid, clearAdminSession, showAboutLinks
} = useGlobalState()

const MAIL_INNER_TABS = ['inbox', 'unknow', 'sendBox', 'sendMail', 'mailWebhook']

const normalizeAdminTab = () => {
  if (['unknow', 'sendBox', 'sendMail', 'mailWebhook'].includes(adminTab.value)) {
    adminMailsSubTab.value = adminTab.value
    adminTab.value = 'mails'
  }
  if (adminTab.value === 'mails' && !MAIL_INNER_TABS.includes(adminMailsSubTab.value)) {
    adminMailsSubTab.value = 'inbox'
  }
}
const message = useMessage()
const router = useRouter()

const SendMail = defineAsyncComponent(() => {
  loading.value = true;
  return import('./admin/SendMail.vue')
    .finally(() => loading.value = false);
});

const showLogoutModal = ref(false)

const handleLogout = async () => {
  clearAdminSession()
  adminTab.value = 'account';
  message.success(t('logoutSuccess'));
  await router.push(getRouterPathWithLang('/login', locale.value));
}

const { t, locale } = useScopedI18n('views.Admin')

const isAdminPasswordLogin = computed(() => isAdminAuthValid.value)

const currentLoginMethod = computed(() => {
  if (isAdminAuthValid.value) {
    const roleLabel = isSubAdmin.value ? t('roleSub') : t('roleMain')
    const name = adminUsername.value ? ` (${adminUsername.value})` : ''
    return `${t('loginViaPassword')} · ${roleLabel}${name}`;
  } else if (openSettings.value.disableAdminPasswordCheck) {
    return t('loginViaDisabledCheck');
  }
  return '';
})

onMounted(async () => {
  normalizeAdminTab()
  if (!openSettings.value.fetched) await api.getOpenSettings(message);
  if (!showAdminPage.value) {
    await router.replace({
      path: getRouterPathWithLang('/login', locale.value),
      query: { tab: 'admin' },
    })
  } else if (!adminTab.value) {
    adminTab.value = 'account'
  }
})

watch([isSubAdmin, adminTab, showAboutLinks], () => {
  normalizeAdminTab()
  if (adminTab.value === 'user') {
    adminTab.value = 'account'
    return
  }
  if (adminTab.value === 'about' && !showAboutLinks.value) {
    adminTab.value = 'account'
    return
  }
  if (!isSubAdmin.value) return
  if (['qucickSetup', 'maintenance', 'subAdmins', 'domainCreateCosts'].includes(adminTab.value)) {
    adminTab.value = 'account'
  }
})
</script>

<template>
  <div>
    <n-tabs v-if="showAdminPage" type="card" v-model:value="adminTab" :placement="globalTabplacement">
      <n-tab-pane name="account" :tab="t('account')">
        <UsageGuide role="admin" />
        <n-tabs type="bar" justify-content="center">
          <n-tab-pane name="account_list" :tab="t('account')" display-directive="show:lazy">
            <Account />
          </n-tab-pane>
          <n-tab-pane name="account_create" :tab="t('account_create')">
            <CreateAccount />
          </n-tab-pane>
          <n-tab-pane name="address_groups" :tab="t('address_groups')">
            <AddressGroups />
          </n-tab-pane>
          <n-tab-pane name="account_settings" :tab="t('account_settings')">
            <AccountSettings />
          </n-tab-pane>
          <n-tab-pane name="senderAccess" :tab="t('senderAccess')">
            <SenderAccess />
          </n-tab-pane>
          <n-tab-pane name="ipBlacklistSettings" :tab="t('ipBlacklistSettings')">
            <IpBlacklistSettings />
          </n-tab-pane>
          <n-tab-pane name="webhook" :tab="t('webhookSettings')">
            <Webhook />
          </n-tab-pane>
        </n-tabs>
      </n-tab-pane>
      <n-tab-pane v-if="isMainAdmin" name="subAdmins" :tab="t('subAdmins')">
        <SubAdmins />
      </n-tab-pane>
      <n-tab-pane v-if="isMainAdmin" name="domainCreateCosts" :tab="t('domainCreateCosts')">
        <DomainCreateCosts />
      </n-tab-pane>
      <n-tab-pane name="mails" :tab="t('mails')" display-directive="show:lazy">
        <n-tabs type="bar" justify-content="center" v-model:value="adminMailsSubTab">
          <n-tab-pane name="inbox" :tab="t('mails')" display-directive="show:lazy">
            <Mails />
          </n-tab-pane>
          <n-tab-pane name="unknow" :tab="t('unknow')" display-directive="show:lazy">
            <MailsUnknow />
          </n-tab-pane>
          <n-tab-pane name="sendBox" :tab="t('sendBox')" display-directive="show:lazy">
            <SendBox />
          </n-tab-pane>
          <n-tab-pane name="sendMail" :tab="t('sendMail')" display-directive="show:lazy">
            <SendMail />
          </n-tab-pane>
          <n-tab-pane name="mailWebhook" :tab="t('mailWebhook')" display-directive="show:lazy">
            <MailWebhook />
          </n-tab-pane>
        </n-tabs>
      </n-tab-pane>
      <n-tab-pane name="aiAdvisor" :tab="t('aiAdvisor')">
        <AiExtractSettings />
      </n-tab-pane>
      <n-tab-pane name="apiTokens" :tab="t('apiTokens')">
        <ApiTokens api-prefix="/admin/api_tokens" />
      </n-tab-pane>
      <n-tab-pane name="telegram" :tab="t('telegram')">
        <Telegram />
      </n-tab-pane>
      <n-tab-pane name="statistics" :tab="t('statistics')">
        <Statistics />
      </n-tab-pane>
      <n-tab-pane v-if="isMainAdmin" name="qucickSetup" :tab="t('qucickSetup')">
        <n-tabs type="bar" justify-content="center">
          <n-tab-pane name="database" :tab="t('database')">
            <DatabaseManager />
          </n-tab-pane>
          <n-tab-pane name="account_settings" :tab="t('account_settings')">
            <AccountSettings />
          </n-tab-pane>
          <n-tab-pane name="workerconfig" :tab="t('workerconfig')">
            <WorkerConfig />
          </n-tab-pane>
        </n-tabs>
      </n-tab-pane>
      <n-tab-pane v-if="isMainAdmin" name="maintenance" :tab="t('maintenance')">
        <n-tabs type="bar" justify-content="center">
          <n-tab-pane name="database" :tab="t('database')">
            <DatabaseManager />
          </n-tab-pane>
          <n-tab-pane name="workerconfig" :tab="t('workerconfig')">
            <WorkerConfig />
          </n-tab-pane>
          <n-tab-pane name="maintenance" :tab="t('maintenance')">
            <Maintenance />
          </n-tab-pane>
        </n-tabs>
      </n-tab-pane>
      <n-tab-pane name="appearance" :tab="t('appearance')">
        <Appearance :showHideAboutConfig="true" />
      </n-tab-pane>
      <n-tab-pane name="adminAccount" :tab="t('adminAccount')">
        <div style="display: flex; justify-content: center; padding: 20px;">
          <n-card style="width: 600px;">
            <n-space vertical>
              <n-text strong>{{ t('loginMethod') }}</n-text>
              <n-text>{{ currentLoginMethod }}</n-text>
              <n-divider v-if="isAdminPasswordLogin" />
              <n-button v-if="isAdminPasswordLogin" type="warning" @click="showLogoutModal = true" block>
                {{ t('logout') }}
              </n-button>
            </n-space>
          </n-card>
        </div>
      </n-tab-pane>
      <n-tab-pane v-if="showAboutLinks" name="about" :tab="t('about')">
        <About />
      </n-tab-pane>
    </n-tabs>
    <n-modal v-model:show="showLogoutModal" preset="dialog" :title="t('logoutConfirmTitle')">
      <p>{{ t('logoutConfirmContent') }}</p>
      <template #action>
        <n-button :loading="loading" @click="handleLogout" size="small" tertiary type="warning">
          {{ t('confirm') }}
        </n-button>
      </template>
    </n-modal>
  </div>
</template>

<style scoped>
.n-pagination {
  margin-top: 10px;
  margin-bottom: 10px;
}
</style>
