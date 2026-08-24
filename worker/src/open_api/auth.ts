import { Hono } from 'hono'
import { Jwt } from 'hono/utils/jwt'

import utils, { checkCfTurnstile, getPasswords, getAdminPasswords, hashPassword } from '../utils';
import i18n from '../i18n';
import { ADDRESS_ACTIVE_SQL } from '../common';
import { getMainAdminUsername, signAdminJwt } from '../admin_auth';

const api = new Hono<HonoCustomType>()

api.post('/open_api/site_login', async (c) => {
    const { password, cf_token } = await c.req.json();
    const msgs = i18n.getMessagesbyContext(c);
    if (utils.isGlobalTurnstileEnabled(c)) {
        try {
            await checkCfTurnstile(c, cf_token);
        } catch (error) {
            return c.text(msgs.TurnstileCheckFailedMsg, 400)
        }
    }
    const passwords = getPasswords(c);
    const hashedPasswords = await Promise.all(passwords.map(p => hashPassword(p)));
    if (!hashedPasswords.length || !password || !hashedPasswords.includes(password)) {
        return c.text(msgs.CustomAuthPasswordMsg, 401)
    }
    return c.json({ success: true })
})

api.post('/open_api/admin_login', async (c) => {
    const { username, password, cf_token } = await c.req.json();
    const msgs = i18n.getMessagesbyContext(c);
    if (utils.isGlobalTurnstileEnabled(c)) {
        try {
            await checkCfTurnstile(c, cf_token);
        } catch (error) {
            return c.text(msgs.TurnstileCheckFailedMsg, 400)
        }
    }
    const reqUsername = typeof username === "string" ? username.trim() : "";
    const envUsername = (c.env.ADMIN_USERNAME || "").trim();
    const adminPasswords = getAdminPasswords(c);
    const hashedPasswords = await Promise.all(adminPasswords.map(p => hashPassword(p)));
    const passwordMatchesMain = !!password && hashedPasswords.includes(password);
    const usernameMatchesMain = !envUsername || !reqUsername || reqUsername === envUsername;
    if (passwordMatchesMain && usernameMatchesMain && (!reqUsername || !envUsername || reqUsername === envUsername)) {
        const mainUsername = envUsername || getMainAdminUsername(c);
        const jwt = await signAdminJwt(c, { role: "main", username: mainUsername });
        return c.json({
            success: true,
            jwt,
            role: "main",
            username: mainUsername,
        })
    }
    if (reqUsername && password) {
        try {
            const subAdmin = await c.env.DB.prepare(
                `SELECT id, username, password, enabled FROM sub_admins WHERE username = ?`
            ).bind(reqUsername).first<{
                id: number, username: string, password: string, enabled: number
            }>();
            if (subAdmin && subAdmin.password === password) {
                if (!subAdmin.enabled) {
                    return c.text(msgs.SubAdminDisabledMsg, 403)
                }
                const jwt = await signAdminJwt(c, {
                    role: "sub",
                    username: subAdmin.username,
                    sub_admin_id: subAdmin.id,
                });
                return c.json({
                    success: true,
                    jwt,
                    role: "sub",
                    username: subAdmin.username,
                })
            }
        } catch (e) {
            console.error("sub_admin login lookup failed", e);
        }
    }
    return c.text(msgs.NeedAdminPasswordMsg, 401)
})

api.post('/open_api/credential_login', async (c) => {
    const { credential, cf_token } = await c.req.json();
    const msgs = i18n.getMessagesbyContext(c);
    if (utils.isGlobalTurnstileEnabled(c)) {
        try {
            await checkCfTurnstile(c, cf_token);
        } catch (error) {
            return c.text(msgs.TurnstileCheckFailedMsg, 400)
        }
    }
    if (!credential) {
        return c.text(msgs.InvalidAddressCredentialMsg, 401)
    }
    try {
        const payload = await Jwt.verify(credential, c.env.JWT_SECRET, "HS256");
        if (!payload.address) {
            return c.text(msgs.InvalidAddressCredentialMsg, 401)
        }
        try {
            const row = await c.env.DB.prepare(
                `SELECT id FROM address WHERE name = ? AND ${ADDRESS_ACTIVE_SQL}`
            ).bind(payload.address).first("id");
            if (!row) {
                return c.text(msgs.InvalidAddressCredentialMsg, 401)
            }
        } catch (e) {
            const message = (e as Error).message || "";
            if (!(message.includes("expires_at") || message.includes("no such column"))) {
                return c.text(msgs.InvalidAddressCredentialMsg, 401)
            }
        }
    } catch (error) {
        return c.text(msgs.InvalidAddressCredentialMsg, 401)
    }
    return c.json({ success: true })
})

export { api }
