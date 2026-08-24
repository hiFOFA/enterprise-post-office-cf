import { Context, Hono } from 'hono'
import { Jwt } from 'hono/utils/jwt'

import utils from './utils';
import { CONSTANTS } from './constants';
import { isS3Enabled } from './mails_api/s3_attachment';
import { isAnySendMailEnabled } from './common';
import { getGlobalUiPrefs } from './global_ui_prefs';
import { authenticateAdmin } from './admin_auth';
import { findValidApiToken } from './api_token';
import { extractApiToken } from './api_token_scopes';
import { hasCredentialHeader, pickBootstrapSettings } from './open_api_access';
import i18n from './i18n';

const api = new Hono<HonoCustomType>

const buildOpenSettings = async (c: Context<HonoCustomType>) => {
    let needAuth = false;
    const passwords = utils.getPasswords(c);
    if (passwords && passwords.length > 0) {
        const auth = c.req.raw.headers.get("x-custom-auth");
        needAuth = !auth || !passwords.includes(auth);
    }
    const smtpImapProxyConfig = utils.getJsonObjectValue<SmtpImapProxyConfig>(
        c.env.SMTP_IMAP_PROXY_CONFIG
    ) || {};
    const smtpProxyConfig = smtpImapProxyConfig.smtp || {};
    const imapProxyConfig = smtpImapProxyConfig.imap || {};
    const globalUiPrefs = await getGlobalUiPrefs(c);

    return {
        "title": c.env.TITLE || "企业邮箱管理平台",
        "announcement": utils.getStringValue(c.env.ANNOUNCEMENT),
        "alwaysShowAnnouncement": utils.getBooleanValue(c.env.ALWAYS_SHOW_ANNOUNCEMENT),
        "prefix": utils.trimLower(c.env.PREFIX),
        "addressRegex": utils.getStringValue(c.env.ADDRESS_REGEX),
        "minAddressLen": utils.getIntValue(c.env.MIN_ADDRESS_LEN, 1),
        "maxAddressLen": utils.getIntValue(c.env.MAX_ADDRESS_LEN, 30),
        "defaultDomains": utils.getDefaultDomains(c),
        "domains": utils.getDomains(c),
        "randomSubdomainDomains": utils.getRandomSubdomainDomains(c),
        "domainLabels": utils.getStringArray(c.env.DOMAIN_LABELS),
        "needAuth": needAuth,
        "adminContact": c.env.ADMIN_CONTACT,
        "enableUserCreateEmail": utils.getBooleanValue(c.env.ENABLE_USER_CREATE_EMAIL),
        "disableAnonymousUserCreateEmail": utils.getBooleanValue(c.env.DISABLE_ANONYMOUS_USER_CREATE_EMAIL),
        "disableCustomAddressName": utils.getBooleanValue(c.env.DISABLE_CUSTOM_ADDRESS_NAME),
        "enableUserDeleteEmail": utils.getBooleanValue(c.env.ENABLE_USER_DELETE_EMAIL),
        "enableAutoReply": utils.getBooleanValue(c.env.ENABLE_AUTO_REPLY),
        "enableIndexAbout": utils.getBooleanValue(c.env.ENABLE_INDEX_ABOUT),
        "copyright": c.env.COPYRIGHT || "版权所有 ©2026-2030 企业邮箱转发",
        "cfTurnstileSiteKey": c.env.CF_TURNSTILE_SITE_KEY,
        "enableWebhook": utils.getBooleanValue(c.env.ENABLE_WEBHOOK),
        "isS3Enabled": isS3Enabled(c),
        "enableSendMail": isAnySendMailEnabled(c),
        "version": CONSTANTS.VERSION,
        "showGithub": !utils.getBooleanValue(c.env.DISABLE_SHOW_GITHUB),
        "showGithubForUser": !utils.getBooleanValue(c.env.DISABLE_SHOW_GITHUB_FOR_USER),
        "hideAbout": globalUiPrefs.hideAbout,
        "disableAdminPasswordCheck": utils.getBooleanValue(c.env.DISABLE_ADMIN_PASSWORD_CHECK),
        "enableAddressPassword": utils.getBooleanValue(c.env.ENABLE_ADDRESS_PASSWORD),
        "enableAgentEmailInfo": utils.getBooleanValue(c.env.ENABLE_AGENT_EMAIL_INFO),
        "smtpImapProxyConfig": {
            "smtp": {
                "host": utils.getStringValue(smtpProxyConfig.host),
                "port": utils.getIntValue(smtpProxyConfig.port, 8025),
                "starttls": utils.getBooleanValue(smtpProxyConfig.starttls),
            },
            "imap": {
                "host": utils.getStringValue(imapProxyConfig.host),
                "port": utils.getIntValue(imapProxyConfig.port, 11143),
                "starttls": utils.getBooleanValue(imapProxyConfig.starttls),
            },
        },
        "statusUrl": utils.getStringValue(c.env.STATUS_URL),
        "enableGlobalTurnstileCheck": utils.isGlobalTurnstileEnabled(c)
    };
}

const requireOpenSettingsSession = async (c: Context<HonoCustomType>): Promise<Response | null> => {
    const msgs = i18n.getMessages(c.get("lang") || c.env.DEFAULT_LANG || "zh");
    const authorization = c.req.raw.headers.get("authorization");
    const adminAuth = c.req.raw.headers.get("x-admin-auth");
    if (!hasCredentialHeader(authorization, adminAuth)) {
        return c.text(msgs.MissingTokenMsg, 401);
    }

    const apiToken = extractApiToken(authorization);
    if (apiToken) {
        const token = await findValidApiToken(c.env.DB, apiToken);
        return token ? null : c.text(msgs.ApiTokenInvalidMsg, 401);
    }

    const admin = await authenticateAdmin(c);
    if (admin) return null;

    if (authorization) {
        try {
            const raw = authorization.replace(/^Bearer\s+/i, "").trim();
            const payload = await Jwt.verify(raw, c.env.JWT_SECRET, "HS256") as JwtPayload;
            if (payload?.address && payload?.address_id) return null;
        } catch {
            return c.text(msgs.InvalidAddressCredentialMsg, 401);
        }
        return c.text(msgs.InvalidAddressCredentialMsg, 401);
    }

    return c.text(msgs.NeedAdminPasswordMsg, 401);
}

api.get('/open_api/bootstrap', async (c) => {
    return c.json(pickBootstrapSettings(await buildOpenSettings(c)));
})

api.get('/open_api/settings', async (c) => {
    const denied = await requireOpenSettingsSession(c);
    if (denied) return denied;
    return c.json(await buildOpenSettings(c));
})

export { api }
