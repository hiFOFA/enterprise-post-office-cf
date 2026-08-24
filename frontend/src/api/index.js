import { useGlobalState } from '../store'
import { h } from 'vue'
import axios from 'axios'

import i18n from '../i18n'
import { getFingerprint } from '../utils/fingerprint'
import { safeBearerHeader, safeHeaderValue } from '../utils/headers'
import { sanitizeHtml } from '../utils/sanitize-html'
import { getRouterPathWithLang, isAdminAuthTokenValid } from '../utils'
import { openSettingsPath } from '../utils/openSettingsPath'
import { normalizeHideAbout } from '../utils/hideAbout'

const API_BASE = import.meta.env.VITE_API_BASE || "";
const {
    loading, auth, jwt, settings, openSettings,
    announcement, showAuth, adminAuth, clearAdminSession
} = useGlobalState();

let redirectingAdminLogin = false
const redirectAdminToLogin = () => {
    clearAdminSession()
    if (redirectingAdminLogin) return
    redirectingAdminLogin = true
    const locale = i18n.global.locale.value
    import('../router').then(({ default: router }) => {
        const current = router.currentRoute.value
        const tab = Array.isArray(current.query.tab) ? current.query.tab[0] : current.query.tab
        const onAdminLogin = current.path.includes('/login') && tab === 'admin'
        if (onAdminLogin) {
            redirectingAdminLogin = false
            return
        }
        return router.replace({
            path: getRouterPathWithLang('/login', locale),
            query: { tab: 'admin' },
        })
    }).finally(() => {
        redirectingAdminLogin = false
    })
}

const instance = axios.create({
    baseURL: API_BASE,
    timeout: 30000,
    validateStatus: (status) => status >= 200 && status <= 500
});

const apiFetch = async (path, options = {}) => {
    loading.value = true;
    try {
        // Get browser fingerprint for request tracking
        const fingerprint = await getFingerprint();

        // Skip auth headers whose value is empty / "undefined" / contains
        // control chars (otherwise axios throws "Invalid character in header
        // content" before the request is sent — see issue #1000).
        const headers = {
            'x-lang': i18n.global.locale.value,
            'x-fingerprint': fingerprint,
            'Content-Type': 'application/json',
        };
        const customAuthHeader = safeHeaderValue(auth.value);
        if (customAuthHeader) headers['x-custom-auth'] = customAuthHeader;
        const adminAuthHeader = safeHeaderValue(adminAuth.value);
        if (adminAuthHeader) headers['x-admin-auth'] = adminAuthHeader;
        const authorizationHeader = safeBearerHeader(options.jwt || jwt.value);
        if (authorizationHeader) headers['Authorization'] = authorizationHeader;

        if (path.startsWith("/admin") && adminAuth.value && !isAdminAuthTokenValid(adminAuth.value)) {
            redirectAdminToLogin()
            throw new Error("Admin session expired")
        }

        const response = await instance.request(path, {
            method: options.method || 'GET',
            data: options.body || null,
            headers,
            timeout: options.timeout || 30000,
        });
        if (response.status === 401 && path.startsWith("/admin")) {
            redirectAdminToLogin()
        }
        if (response.status === 401 && openSettings.value.needAuth) {
            showAuth.value = true;
        }
        if (response.status >= 300) {
            throw new Error(`[${response.status}]: ${response.data}` || "error");
        }
        const data = response.data;
        return data;
    } catch (error) {
        if (error.response) {
            throw new Error(`Code ${error.response.status}: ${error.response.data}` || "error");
        }
        throw error;
    } finally {
        loading.value = false;
    }
}

const getOpenSettings = async (message, notification) => {
    try {
        const hasCredential = isAdminAuthTokenValid(adminAuth.value)
            || (typeof jwt.value === 'string' && jwt.value.trim() !== '' && jwt.value !== 'undefined');
        const res = await api.fetch(openSettingsPath(hasCredential));
        const domains = Array.isArray(res["domains"]) ? res["domains"] : [];
        const domainLabels = res["domainLabels"] || [];
        if (domains.length < 1) {
            message.error("No domains found, please check your worker settings");
        }
        Object.assign(openSettings.value, {
            ...res,
            title: res["title"] || openSettings.value.title,
            prefix: res["prefix"] || "",
            minAddressLen: res["minAddressLen"] || 1,
            maxAddressLen: res["maxAddressLen"] || 30,
            needAuth: res["needAuth"] || false,
            defaultDomains: res["defaultDomains"] || [],
            randomSubdomainDomains: res["randomSubdomainDomains"] || [],
            domains: domains.map((domain, index) => {
                return {
                    label: domainLabels.length > index ? domainLabels[index] : domain,
                    value: domain
                }
            }),
            adminContact: res["adminContact"] || "",
            enableUserCreateEmail: res["enableUserCreateEmail"] || false,
            disableAnonymousUserCreateEmail: res["disableAnonymousUserCreateEmail"] || false,
            disableCustomAddressName: res["disableCustomAddressName"] || false,
            enableUserDeleteEmail: res["enableUserDeleteEmail"] || false,
            enableAutoReply: res["enableAutoReply"] || false,
            enableIndexAbout: res["enableIndexAbout"] || false,
            copyright: res["copyright"] || openSettings.value.copyright,
            cfTurnstileSiteKey: res["cfTurnstileSiteKey"] || "",
            enableWebhook: res["enableWebhook"] || false,
            isS3Enabled: res["isS3Enabled"] || false,
            showGithubForUser: res["showGithubForUser"] ?? openSettings.value.showGithubForUser,
            hideAbout: normalizeHideAbout(res["hideAbout"]),
            enableAddressPassword: res["enableAddressPassword"] || false,
            enableAgentEmailInfo: res["enableAgentEmailInfo"] || false,
            smtpImapProxyConfig: res["smtpImapProxyConfig"] || openSettings.value.smtpImapProxyConfig,
            statusUrl: res["statusUrl"] || "",
            enableGlobalTurnstileCheck: res["enableGlobalTurnstileCheck"] || false,
        });
        if (openSettings.value.needAuth) {
            showAuth.value = true;
        }
        if (openSettings.value.announcement
            && !openSettings.value.fetched
            && (openSettings.value.announcement != announcement.value
                || openSettings.value.alwaysShowAnnouncement)
        ) {
            announcement.value = openSettings.value.announcement;
            notification.info({
                content: () => {
                    return h("div", {
                        innerHTML: sanitizeHtml(announcement.value)
                    });
                }
            });
        }
    } catch (error) {
        message.error(error.message || "error");
    } finally {
        openSettings.value.fetched = true;
    }
}

const getSettings = async () => {
    try {
        if (typeof jwt.value != 'string' || jwt.value.trim() === '' || jwt.value === 'undefined') {
            return "";
        }
        const res = await apiFetch("/api/settings");;
        settings.value = {
            address: res["address"],
            auto_reply: res["auto_reply"],
            send_balance: res["send_balance"],
        };
    } finally {
        settings.value.fetched = true;
    }
}


const adminShowAddressCredential = async (id) => {
    try {
        const { jwt: addressCredential } = await apiFetch(`/admin/show_password/${id}`);
        return addressCredential;
    } catch (error) {
        throw error;
    }
}

const adminDeleteAddress = async (id) => {
    try {
        await apiFetch(`/admin/delete_address/${id}`, {
            method: 'DELETE'
        });
    } catch (error) {
        throw error;
    }
}

export const api = {
    fetch: apiFetch,
    getSettings,
    getOpenSettings,
    adminShowAddressCredential,
    adminDeleteAddress,
}
