<script setup>
import { ref, onMounted } from 'vue'
import { useScopedI18n } from '@/i18n/app'
import { EmailOutlined } from '@vicons/material'

import AdminContact from '../common/AdminContact.vue'
import Turnstile from '../../components/Turnstile.vue'

import { useGlobalState } from '../../store'
import { api } from '../../api'
import { addToLocalAddressCache, hashPassword } from '../../utils'

const props = defineProps({
    bindUserAddress: {
        type: Function,
        default: async () => {},
    },
})

const message = useMessage()
const notification = useNotification()

const {
    jwt, loading, openSettings
} = useGlobalState()

const tabValue = ref('signin')
const credential = ref('')
const loginCfToken = ref("")
const loginTurnstileRef = ref(null)
const loginMethod = ref('credential')
const loginAddress = ref('')
const loginPassword = ref('')

const initLoginMethod = () => {
    if (openSettings.value?.enableAddressPassword) {
        loginMethod.value = 'password';
    } else {
        loginMethod.value = 'credential';
    }
}

const login = async () => {
    if (loginMethod.value === 'password') {
        if (!loginAddress.value || !loginPassword.value) {
            message.error(t('emailPasswordRequired'));
            return;
        }
        try {
            const res = await api.fetch('/api/address_login', {
                method: 'POST',
                body: JSON.stringify({
                    email: loginAddress.value,
                    password: await hashPassword(loginPassword.value),
                    cf_token: loginCfToken.value
                }),
            });
            jwt.value = res.jwt;
            addToLocalAddressCache(res.jwt)
            await api.getSettings();
            try {
                await props.bindUserAddress();
            } catch (error) {
                message.error(`${t('bindUserAddressError')}: ${error.message}`);
            }
        } catch (error) {
            message.error(error.message || "error");
            loginTurnstileRef.value?.refresh?.();
        }
        return;
    }
    if (!credential.value) {
        message.error(t('credentialInput'));
        return;
    }
    try {
        await api.fetch('/open_api/credential_login', {
            method: 'POST',
            body: JSON.stringify({
                credential: credential.value,
                cf_token: loginCfToken.value
            })
        });
        jwt.value = credential.value;
        addToLocalAddressCache(credential.value)
        await api.getSettings();
        try {
            await props.bindUserAddress();
        } catch (error) {
            message.error(`${t('bindUserAddressError')}: ${error.message}`);
        }
    } catch (error) {
        message.error(error.message || "error");
        loginTurnstileRef.value?.refresh?.();
    }
}

const { t } = useScopedI18n('views.common.Login')

onMounted(async () => {
    if (!openSettings.value.domains || openSettings.value.domains.length === 0) {
        await api.getOpenSettings(message, notification);
    }
    initLoginMethod();
});
</script>

<template>
    <div>
        <n-tabs v-if="openSettings.fetched" v-model:value="tabValue" size="large" justify-content="space-evenly">
            <n-tab-pane name="signin" :tab="t('addMailbox')">
                <n-form>
                    <div v-if="loginMethod === 'password'">
                        <n-form-item-row :label="t('email')" required>
                            <n-input v-model:value="loginAddress" />
                        </n-form-item-row>
                        <n-form-item-row :label="t('password')" required>
                            <n-input v-model:value="loginPassword" type="password" show-password-on="click"
                                @keyup.enter="login" />
                        </n-form-item-row>
                    </div>

                    <div v-else>
                        <n-form-item-row :label="t('credential')" required>
                            <n-input v-model:value="credential" type="textarea" :autosize="{ minRows: 3 }" />
                        </n-form-item-row>
                    </div>

                    <Turnstile ref="loginTurnstileRef" v-if="openSettings.enableGlobalTurnstileCheck"
                        v-model:value="loginCfToken" />

                    <div class="switch-login-button">
                        <n-button v-if="openSettings?.enableAddressPassword"
                            @click="loginMethod === 'password' ? loginMethod = 'credential' : loginMethod = 'password'"
                            type="info" quaternary size="tiny">
                            {{ loginMethod === 'password' ? t('credentialLogin') : t('passwordLogin') }}
                        </n-button>
                    </div>

                    <n-button @click="login" :loading="loading" type="primary" block secondary strong>
                        <template #icon>
                            <n-icon :component="EmailOutlined" />
                        </template>
                        {{ t('addMailbox') }}
                    </n-button>
                </n-form>
            </n-tab-pane>
            <n-tab-pane name="help" :tab="t('help')">
                <n-alert :show-icon="false" :bordered="false">
                    <span>{{ t('pleaseGetNewEmail') }}</span>
                </n-alert>
                <AdminContact />
            </n-tab-pane>
        </n-tabs>
    </div>
</template>


<style scoped>
.n-alert {
    margin-top: 10px;
    margin-bottom: 10px;
    text-align: center;
}

.n-form .n-button {
    margin-top: 10px;
}

.switch-login-button {
    display: flex;
    justify-content: center;
    margin: 10px 0;
}

.n-form {
    text-align: left;
}
</style>
