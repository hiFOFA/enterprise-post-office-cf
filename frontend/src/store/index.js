import { computed, ref } from "vue";
import {
    createGlobalState, useStorage, useDark, useToggle,
    useLocalStorage, useSessionStorage
} from '@vueuse/core'
import { decodeJwtPayload, isAdminAuthTokenValid } from '../utils'
import { DEFAULT_HIDE_ABOUT, normalizeHideAbout } from '../utils/hideAbout'

export const useGlobalState = createGlobalState(
    () => {
        const isDark = useDark()
        const toggleDark = useToggle(isDark)
        const loading = ref(false);
        const announcement = useLocalStorage('announcement', '');
        const useSimpleIndex = useLocalStorage('useSimpleIndex', false);
        const openSettings = ref({
            fetched: false,
            title: '企业邮箱管理平台',
            announcement: '',
            alwaysShowAnnouncement: false,
            prefix: '',
            addressRegex: '',
            needAuth: false,
            adminContact: '',
            enableUserCreateEmail: false,
            disableAnonymousUserCreateEmail: false,
            disableCustomAddressName: false,
            enableUserDeleteEmail: false,
            enableAutoReply: false,
            enableIndexAbout: false,
            /** @type {string[]} */
            defaultDomains: [],
            /** @type {string[]} */
            randomSubdomainDomains: [],
            /** @type {Array<{label: string, value: string}>} */
            domains: [],
            copyright: '版权所有 ©2026-2030 企业邮箱转发',
            cfTurnstileSiteKey: '',
            enableWebhook: false,
            isS3Enabled: false,
            enableSendMail: false,
            showGithub: true,
            showGithubForUser: true,
            hideAbout: { ...DEFAULT_HIDE_ABOUT },
            disableAdminPasswordCheck: false,
            enableAddressPassword: false,
            enableAgentEmailInfo: false,
            smtpImapProxyConfig: {
                smtp: {
                    host: '',
                    port: 8025,
                    starttls: false,
                },
                imap: {
                    host: '',
                    port: 11143,
                    starttls: false,
                },
            },
            statusUrl: '',
            enableGlobalTurnstileCheck: false,
        })
        const settings = ref({
            fetched: false,
            send_balance: 0,
            address: '',
            auto_reply: {
                subject: '',
                message: '',
                enabled: false,
                source_prefix: '',
                name: '',
            }
        });
        const sendMailModel = useSessionStorage('sendMailModel', {
            fromName: "",
            toName: "",
            toMail: "",
            subject: "",
            contentType: 'text',
            content: "",
        });
        const showAuth = ref(false);
        const showAddressCredential = ref(false);
        const showAdminAuth = ref(false);
        const auth = useStorage('auth', '');
        const adminAuth = useStorage('adminAuth', '');
        const adminRole = useStorage('adminRole', '');
        const adminUsername = useStorage('adminUsername', '');
        const jwt = useStorage('jwt', '');
        const addressPassword = useSessionStorage('addressPassword', '');
        const adminTab = useSessionStorage('adminTab', "account");
        const adminMailsSubTab = useSessionStorage('adminMailsSubTab', "inbox");
        const adminMailReloadAt = ref(0);
        const adminSendBoxReloadAt = ref(0);
        const adminMailTabAddress = ref("");
        const adminSendBoxTabAddress = ref("");
        const mailboxSplitSize = useStorage('mailboxSplitSize', 0.25);
        const mailListView = useStorage('mailListView', false);
        const mailListPreviewLineClamp = useStorage('mailListPreviewLineClamp', 2);
        const useIframeShowMail = useStorage('useIframeShowMail', false);
        const preferShowTextMail = useStorage('preferShowTextMail', false);
        const preferredLocale = useStorage('preferredLocale', '');
        const indexTab = useSessionStorage('indexTab', 'mailbox');
        const globalTabplacement = useStorage('globalTabplacement', 'top');
        const useSideMargin = useStorage('useSideMargin', true);
        const useUTCDate = useStorage('useUTCDate', false);
        const autoLoadRemoteImages = useStorage('autoLoadRemoteImages', true);
        const autoRefresh = useStorage('autoRefresh', false);
        const configAutoRefreshInterval = useStorage("configAutoRefreshInterval", 60);
        const isAdminAuthValid = computed(() => isAdminAuthTokenValid(adminAuth.value))
        const clearAdminSession = () => {
            adminAuth.value = ''
            adminRole.value = ''
            adminUsername.value = ''
            showAdminAuth.value = false
        }
        const resolvedAdminRole = computed(() => {
            if (!isAdminAuthValid.value) return ''
            if (adminRole.value === 'main' || adminRole.value === 'sub') {
                return adminRole.value
            }
            const payload = decodeJwtPayload(adminAuth.value)
            if (payload?.typ === 'admin' && (payload.role === 'main' || payload.role === 'sub')) {
                return payload.role
            }
            return ''
        })
        const resolvedAdminUsername = computed(() => {
            if (!isAdminAuthValid.value) return ''
            if (adminUsername.value) return adminUsername.value
            const payload = decodeJwtPayload(adminAuth.value)
            if (typeof payload?.username === 'string') return payload.username
            return ''
        })
        const isMainAdmin = computed(() => {
            if (resolvedAdminRole.value === 'sub') return false
            if (resolvedAdminRole.value === 'main') return true
            return isAdminAuthValid.value
        })
        const isSubAdmin = computed(() => resolvedAdminRole.value === 'sub')
        const aboutAudience = computed(() => {
            if (resolvedAdminRole.value === 'sub' || isSubAdmin.value) return 'sub'
            if (isAdminAuthValid.value) return 'main'
            return 'user'
        })
        const showAboutLinks = computed(() => {
            const hideAbout = normalizeHideAbout(openSettings.value.hideAbout)
            return !hideAbout[aboutAudience.value]
        })
        const canConfigureHideAbout = computed(() =>
            isAdminAuthValid.value && resolvedAdminRole.value !== 'sub'
        )
        const showAdminPage = computed(() =>
            isAdminAuthValid.value
            || openSettings.value.disableAdminPasswordCheck
        );
        const telegramApp = ref(window.Telegram?.WebApp || {});
        const isTelegram = ref(!!window.Telegram?.WebApp?.initData);
        const browserFingerprint = ref('');
        return {
            isDark,
            toggleDark,
            loading,
            settings,
            sendMailModel,
            announcement,
            openSettings,
            showAuth,
            showAddressCredential,
            auth,
            jwt,
            adminAuth,
            adminRole,
            adminUsername,
            isAdminAuthValid,
            clearAdminSession,
            resolvedAdminRole,
            resolvedAdminUsername,
            isMainAdmin,
            isSubAdmin,
            aboutAudience,
            showAboutLinks,
            canConfigureHideAbout,
            showAdminAuth,
            adminTab,
            adminMailsSubTab,
            adminMailReloadAt,
            adminSendBoxReloadAt,
            adminMailTabAddress,
            adminSendBoxTabAddress,
            mailboxSplitSize,
            mailListView,
            mailListPreviewLineClamp,
            useIframeShowMail,
            preferShowTextMail,
            preferredLocale,
            indexTab,
            globalTabplacement,
            useSideMargin,
            useUTCDate,
            autoLoadRemoteImages,
            autoRefresh,
            configAutoRefreshInterval,
            telegramApp,
            isTelegram,
            showAdminPage,
            useSimpleIndex,
            addressPassword,
            browserFingerprint,
        }
    },
)
