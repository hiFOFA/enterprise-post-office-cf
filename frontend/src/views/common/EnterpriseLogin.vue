<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { EmailOutlined, VerifiedUserOutlined, KeyboardArrowDownOutlined } from '@vicons/material'
import { Language } from '@vicons/fa'

import { useScopedI18n } from '@/i18n/app'
import { useLocaleSwitcher } from '@/i18n/useLocaleSwitcher'
import Turnstile from '../../components/Turnstile.vue'
import { useGlobalState } from '../../store'
import { api } from '../../api'
import { addToLocalAddressCache, getRouterPathWithLang, hashPassword } from '../../utils'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const notification = useNotification()
const { locale, t } = useScopedI18n('views.common.EnterpriseLogin')
const { languageOptions, currentLocaleLabel, changeLocale } = useLocaleSwitcher()

const {
    jwt, loading, openSettings, adminAuth, adminRole, adminUsername,
    adminTab, showAdminAuth, isAdminAuthValid
} = useGlobalState()

const mode = ref('employee')
const email = ref('')
const password = ref('')
const credential = ref('')
const loginMethod = ref('password')
const adminUser = ref('')
const adminPassword = ref('')
const loginCfToken = ref('')
const loginTurnstileRef = ref(null)
const formError = ref('')

const companyName = computed(() => openSettings.value.title || t('companyNameFallback'))

const applyTabFromQuery = () => {
    const tab = Array.isArray(route.query.tab) ? route.query.tab[0] : route.query.tab
    if (tab === 'admin') {
        mode.value = 'admin'
    } else if (tab === 'employee' || tab === 'personal') {
        mode.value = 'employee'
    }
}

watch(() => route.query.tab, applyTabFromQuery, { immediate: true })

const redirectIfAlreadyLoggedIn = async () => {
    const tab = Array.isArray(route.query.tab) ? route.query.tab[0] : route.query.tab
    if (tab === 'admin') return
    if (isAdminAuthValid.value) {
        await router.replace(getRouterPathWithLang('/admin', locale.value))
        return
    }
    if (jwt.value) {
        await router.replace(getRouterPathWithLang('/', locale.value))
    }
}

const setError = (text) => {
    formError.value = text || ''
    if (text) message.error(text)
}

const loginEmployee = async () => {
    formError.value = ''
    if (loginMethod.value === 'password') {
        if (!email.value || !password.value) {
            setError(t('emailPasswordRequired'))
            return
        }
        try {
            const res = await api.fetch('/api/address_login', {
                method: 'POST',
                body: JSON.stringify({
                    email: email.value,
                    password: await hashPassword(password.value),
                    cf_token: loginCfToken.value
                })
            })
            if (!res?.jwt) {
                setError(t('loginFailed'))
                return
            }
            jwt.value = res.jwt
            addToLocalAddressCache(res.jwt)
            await api.getSettings()
            await router.push(getRouterPathWithLang('/', locale.value))
        } catch (error) {
            setError(error.message || t('loginFailed'))
            loginTurnstileRef.value?.refresh?.()
        }
        return
    }
    if (!credential.value) {
        setError(t('credentialInput'))
        return
    }
    try {
        await api.fetch('/open_api/credential_login', {
            method: 'POST',
            body: JSON.stringify({
                credential: credential.value,
                cf_token: loginCfToken.value
            })
        })
        jwt.value = credential.value
        addToLocalAddressCache(credential.value)
        await api.getSettings()
        await router.push(getRouterPathWithLang('/', locale.value))
    } catch (error) {
        setError(error.message || t('loginFailed'))
        loginTurnstileRef.value?.refresh?.()
    }
}

const loginAdmin = async () => {
    formError.value = ''
    if (!adminUser.value || !adminPassword.value) {
        setError(t('adminRequired'))
        return
    }
    try {
        const res = await api.fetch('/open_api/admin_login', {
            method: 'POST',
            body: JSON.stringify({
                username: adminUser.value,
                password: await hashPassword(adminPassword.value),
                cf_token: loginCfToken.value
            })
        })
        if (!res?.jwt) {
            setError(t('loginFailed'))
            return
        }
        adminAuth.value = res.jwt
        adminRole.value = res.role || ''
        adminUsername.value = res.username || adminUser.value
        adminTab.value = 'account'
        showAdminAuth.value = false
        await router.push(getRouterPathWithLang('/admin', locale.value))
    } catch (error) {
        setError(error.message || t('loginFailed'))
        loginTurnstileRef.value?.refresh?.()
    }
}

const submit = async () => {
    if (mode.value === 'admin') {
        await loginAdmin()
        return
    }
    await loginEmployee()
}

onMounted(async () => {
    applyTabFromQuery()
    if (!openSettings.value.fetched) {
        await api.getOpenSettings(message, notification)
    }
    await redirectIfAlreadyLoggedIn()
})
</script>

<template>
    <div class="ent-login">
        <section class="ent-brand">
            <div class="ent-brand__grid" aria-hidden="true"></div>
            <div class="ent-brand__logo">
                <img src="/logo.png" :alt="companyName" class="ent-brand__mark" />
                <span>{{ companyName }}</span>
            </div>
            <div class="ent-brand__inner">
                <h1 class="ent-brand__title">{{ t('brandTitle') }}</h1>
                <p class="ent-brand__subtitle">{{ t('brandSubtitle') }}</p>
                <ul class="ent-brand__points">
                    <li><span class="dot" />{{ t('brandPoint1') }}</li>
                    <li><span class="dot" />{{ t('brandPoint2') }}</li>
                    <li><span class="dot" />{{ t('brandPoint3') }}</li>
                </ul>
            </div>
            <div class="ent-brand__foot">{{ t('brandFoot') }}</div>
        </section>

        <section class="ent-form">
            <div class="ent-form__card">
                <div class="ent-form__locale">
                    <n-dropdown :options="languageOptions" @select="changeLocale" trigger="click">
                        <button type="button" class="ent-locale-button" :aria-label="t('selectLanguage')">
                            <n-icon :component="Language" :size="15" />
                            <span>{{ currentLocaleLabel }}</span>
                            <n-icon :component="KeyboardArrowDownOutlined" :size="16" />
                        </button>
                    </n-dropdown>
                </div>
                <div class="ent-form__head">
                    <img src="/logo.png" :alt="companyName" class="ent-form__mark" />
                    <h2>{{ t('loginTitle') }}</h2>
                    <p>{{ t('loginSubtitle') }}</p>
                </div>

                <div class="ent-seg">
                    <button type="button" :class="{ active: mode === 'employee' }" @click="mode = 'employee'">
                        <n-icon :component="EmailOutlined" :size="16" />
                        {{ t('employeeTab') }}
                    </button>
                    <button type="button" :class="{ active: mode === 'admin' }" @click="mode = 'admin'">
                        <n-icon :component="VerifiedUserOutlined" :size="16" />
                        {{ t('adminTab') }}
                    </button>
                </div>

                <n-alert v-if="formError" type="error" :show-icon="false" :bordered="false" class="ent-error">
                    {{ formError }}
                </n-alert>

                <form v-if="mode === 'employee'" class="ent-fields" @submit.prevent="submit">
                    <template v-if="loginMethod === 'password'">
                        <label class="ent-label">{{ t('emailLabel') }}</label>
                        <input class="ent-input" type="text" v-model="email" autocomplete="username"
                            :placeholder="t('emailPlaceholder')" @keyup.enter="submit" />
                        <label class="ent-label">{{ t('passwordLabel') }}</label>
                        <input class="ent-input" type="password" v-model="password" autocomplete="current-password"
                            :placeholder="t('passwordPlaceholder')" @keyup.enter="submit" />
                    </template>
                    <template v-else>
                        <label class="ent-label">{{ t('credentialLabel') }}</label>
                        <textarea class="ent-input ent-textarea" v-model="credential"
                            :placeholder="t('credentialPlaceholder')" />
                    </template>
                    <Turnstile ref="loginTurnstileRef" v-if="openSettings.enableGlobalTurnstileCheck"
                        v-model:value="loginCfToken" />
                    <button type="button" class="ent-switch" @click="loginMethod = loginMethod === 'password' ? 'credential' : 'password'">
                        {{ loginMethod === 'password' ? t('credentialLogin') : t('passwordLogin') }}
                    </button>
                    <n-button class="ent-submit" type="primary" size="large" block attr-type="submit"
                        :loading="loading">
                        {{ t('loginEmail') }}
                    </n-button>
                </form>

                <form v-else class="ent-fields" @submit.prevent="submit">
                    <label class="ent-label">{{ t('usernameLabel') }}</label>
                    <input class="ent-input" type="text" v-model="adminUser" autocomplete="username"
                        :placeholder="t('usernamePlaceholder')" @keyup.enter="submit" />
                    <label class="ent-label">{{ t('passwordLabel') }}</label>
                    <input class="ent-input" type="password" v-model="adminPassword" autocomplete="current-password"
                        :placeholder="t('passwordPlaceholder')" @keyup.enter="submit" />
                    <Turnstile ref="loginTurnstileRef" v-if="openSettings.enableGlobalTurnstileCheck"
                        v-model:value="loginCfToken" />
                    <n-button class="ent-submit" type="primary" size="large" block attr-type="submit"
                        :loading="loading">
                        {{ t('loginAdmin') }}
                    </n-button>
                </form>

                <p class="ent-form__hint">{{ mode === 'admin' ? t('adminHint') : t('employeeHint') }}</p>
            </div>
        </section>
    </div>
</template>

<style scoped>
.ent-login {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: grid;
    grid-template-columns: 1.05fr 1fr;
    background: #f0f2f6;
    font-family: inherit;
}

.ent-brand {
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 56px 60px 40px;
    color: #eaf0fb;
    background: linear-gradient(155deg, #0f1d35 0%, #1b3358 50%, #2a4a7a 100%);
}

.ent-brand__grid {
    position: absolute;
    inset: 0;
    background-image:
        linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(circle at 30% 15%, #000 0%, transparent 70%);
    -webkit-mask-image: radial-gradient(circle at 30% 15%, #000 0%, transparent 70%);
}

.ent-brand__logo {
    position: absolute;
    top: 40px;
    left: 0;
    right: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    font-size: 18px;
    font-weight: 600;
    letter-spacing: .3px;
    color: #fff;
}

.ent-brand__mark {
    width: 52px;
    height: 52px;
    object-fit: contain;
}

.ent-brand__inner {
    position: relative;
    z-index: 1;
    max-width: 460px;
    text-align: center;
    transform: translateY(-8%);
}

.ent-brand__title {
    font-size: 42px;
    line-height: 1.12;
    font-weight: 800;
    margin: 0 0 20px;
    color: #fff;
    letter-spacing: -.5px;
    text-shadow: 0 2px 16px rgba(0, 0, 0, .15);
}

.ent-brand__subtitle {
    font-size: 16px;
    line-height: 1.7;
    color: #a8b8d4;
    margin: 0 auto 40px;
    max-width: 400px;
}

.ent-brand__points {
    list-style: none;
    padding: 0;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 13px;
    max-width: 360px;
}

.ent-brand__points li {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 12px;
    font-size: 14.5px;
    color: #cdd9ee;
}

.ent-brand__points .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #5b9bff;
    box-shadow: 0 0 0 4px rgba(91, 155, 255, .15);
    flex: none;
}

.ent-brand__foot {
    position: absolute;
    bottom: 40px;
    left: 0;
    right: 0;
    z-index: 1;
    text-align: center;
    font-size: 12.5px;
    color: #6a82a8;
    letter-spacing: .2px;
}

.ent-form {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
    background: #f0f2f6;
}

.ent-form__card {
    width: 100%;
    max-width: 380px;
}

.ent-form__locale {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 12px;
}

.ent-locale-button {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: 1px solid #d5dae2;
    border-radius: 8px;
    background-color: #ffffff;
    color: #4b5563;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all .18s ease;
}

.ent-locale-button:hover {
    border-color: #a9b6ff;
    color: #1f2937;
}

:global(.dark) .ent-locale-button,
:global(html.dark) .ent-locale-button {
    background-color: #1a1f2b;
    border-color: #313847;
    color: #cbd5e1;
}

:global(.dark) .ent-locale-button:hover,
:global(html.dark) .ent-locale-button:hover {
    border-color: #4c8dff;
    color: #ffffff;
}

.ent-form__mark {
    display: none;
    width: 64px;
    height: 64px;
    object-fit: contain;
    margin: 0 auto 16px;
}

.ent-form__head h2 {
    font-size: 28px;
    font-weight: 800;
    margin: 0 0 6px;
    color: #14243f;
    letter-spacing: -.3px;
}

.ent-form__head p {
    font-size: 14px;
    color: #7a8598;
    margin: 0 0 28px;
    line-height: 1.5;
}

.ent-seg {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    padding: 5px;
    background: rgba(20, 36, 63, .06);
    border-radius: 12px;
    margin-bottom: 26px;
}

.ent-seg button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    border: none;
    background: transparent;
    padding: 9px 0;
    border-radius: 9px;
    font-size: 14px;
    font-weight: 500;
    color: #55617a;
    cursor: pointer;
    transition: all .18s ease;
}

.ent-seg button.active {
    background: #fff;
    color: #14243f;
    box-shadow: 0 2px 8px rgba(20, 36, 63, .10);
    font-weight: 600;
}

.ent-label {
    display: block;
    font-size: 13px;
    font-weight: 600;
    color: #3a4458;
    margin: 16px 0 7px;
    letter-spacing: .2px;
}

.ent-label:first-of-type {
    margin-top: 0;
}

.ent-submit {
    margin-top: 24px;
    font-weight: 600;
    --n-height: 48px;
    border-radius: 10px;
}

.ent-fields {
    display: flex;
    flex-direction: column;
}

.ent-input {
    width: 100%;
    box-sizing: border-box;
    height: 48px;
    padding: 0 16px;
    font-size: 15px;
    line-height: 48px;
    color: #1f2937;
    background-color: #ffffff;
    border: 1px solid #d5dae2;
    border-radius: 10px;
    outline: none;
    transition: border-color .18s ease, box-shadow .18s ease;
    -webkit-appearance: none;
    appearance: none;
}

.ent-textarea {
    height: auto;
    min-height: 96px;
    line-height: 1.5;
    padding: 12px 16px;
    resize: vertical;
}

.ent-input::placeholder {
    color: #9aa4b2;
}

.ent-input:hover {
    border-color: #a9b6ff;
}

.ent-input:focus {
    border-color: #4c8dff;
    box-shadow: 0 0 0 3px rgba(76, 141, 255, .18);
}

.ent-switch {
    margin-top: 12px;
    border: none;
    background: transparent;
    color: #4c8dff;
    font-size: 13px;
    cursor: pointer;
    align-self: center;
}

.ent-error {
    margin-bottom: 16px;
    text-align: left;
}

.ent-form__hint {
    text-align: center;
    font-size: 12.5px;
    color: #97a1b3;
    margin: 22px 0 0;
    line-height: 1.6;
}

:global(.dark) .ent-login,
:global(html.dark) .ent-login {
    background: #0c0f15;
}

:global(.dark) .ent-form,
:global(html.dark) .ent-form {
    background: #0c0f15;
}

:global(.dark) .ent-form__head h2,
:global(html.dark) .ent-form__head h2 {
    color: #eaf0fb;
}

:global(.dark) .ent-form__head p,
:global(html.dark) .ent-form__head p {
    color: #8b95a7;
}

:global(.dark) .ent-seg,
:global(html.dark) .ent-seg {
    background: rgba(255, 255, 255, .06);
}

:global(.dark) .ent-seg button.active,
:global(html.dark) .ent-seg button.active {
    background: #1c2230;
    color: #eaf0fb;
}

:global(.dark) .ent-label,
:global(html.dark) .ent-label {
    color: #aab3c4;
}

:global(.dark) .ent-input,
:global(html.dark) .ent-input {
    color: #e6ebf3;
    background-color: #1a1f2b;
    border-color: #313847;
}

:global(.dark) .ent-input::placeholder,
:global(html.dark) .ent-input::placeholder {
    color: #6b7688;
}

:global(.dark) .ent-input:focus,
:global(html.dark) .ent-input:focus {
    border-color: #4c8dff;
    box-shadow: 0 0 0 3px rgba(76, 141, 255, .25);
}

@media (max-width: 860px) {
    .ent-login {
        grid-template-columns: 1fr;
    }

    .ent-brand {
        display: none;
    }

    .ent-form__mark {
        display: block;
    }
}
</style>
