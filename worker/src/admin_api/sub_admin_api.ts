import { Context } from "hono";

import { CONSTANTS } from "../constants";
import i18n from "../i18n";
import { getJsonSetting, saveSetting, getSetting } from "../utils";
import { getMainAdminUsername } from "../admin_auth";
import { ensureAddressGroupTables } from "../address_groups";
import { ensureDefaultOwnerGroups } from "../default_owner_groups_sync";
import {
    normalizeDomainCreateCosts,
    parseExpireDaysSetting,
    type DomainCreateCosts,
} from "../admin_quota";

type SubAdminRow = {
    id: number
    username: string
    enabled: number
    quota_balance: number
    created_at: string
    updated_at: string
}

const listSubAdmins = async (c: Context<HonoCustomType>) => {
    const { results } = await c.env.DB.prepare(
        `SELECT id, username, enabled, quota_balance, created_at, updated_at`
        + ` FROM sub_admins ORDER BY id DESC`
    ).all<SubAdminRow>();
    return c.json({ results: results || [] });
}

const createSubAdmin = async (c: Context<HonoCustomType>) => {
    const msgs = i18n.getMessagesbyContext(c);
    const { username, password, enabled, quota_balance } = await c.req.json();
    const name = typeof username === "string" ? username.trim() : "";
    if (!name || !password) {
        return c.text(msgs.RequiredFieldMsg, 400);
    }
    if (name === getMainAdminUsername(c) || name === (c.env.ADMIN_USERNAME || "").trim()) {
        return c.text(msgs.SubAdminUsernameReservedMsg, 400);
    }
    const enabledValue = enabled === 0 || enabled === false ? 0 : 1;
    const balance = Number.isFinite(Number(quota_balance)) ? Math.floor(Number(quota_balance)) : 0;
    try {
        const { success } = await c.env.DB.prepare(
            `INSERT INTO sub_admins (username, password, enabled, quota_balance)`
            + ` VALUES (?, ?, ?, ?)`
        ).bind(name, password, enabledValue, Math.max(0, balance)).run();
        if (!success) {
            return c.text(msgs.OperationFailedMsg, 500);
        }
    } catch (e) {
        const message = (e as Error).message || "";
        if (message.includes("UNIQUE")) {
            return c.text(msgs.SubAdminUsernameExistsMsg, 400);
        }
        return c.text(`${msgs.OperationFailedMsg}: ${message}`, 500);
    }
    const row = await c.env.DB.prepare(
        `SELECT id, username, enabled, quota_balance, created_at, updated_at`
        + ` FROM sub_admins WHERE username = ?`
    ).bind(name).first<SubAdminRow>();
    await ensureAddressGroupTables(c.env.DB);
    await ensureDefaultOwnerGroups(c);
    return c.json({ success: true, result: row });
}

const updateSubAdmin = async (c: Context<HonoCustomType>) => {
    const msgs = i18n.getMessagesbyContext(c);
    const { id } = c.req.param();
    const { username, password, enabled } = await c.req.json();
    const existing = await c.env.DB.prepare(
        `SELECT id FROM sub_admins WHERE id = ?`
    ).bind(id).first("id");
    if (!existing) {
        return c.text(msgs.SubAdminNotFoundMsg, 404);
    }
    if (typeof username === "string") {
        const name = username.trim();
        if (!name) {
            return c.text(msgs.RequiredFieldMsg, 400);
        }
        if (name === getMainAdminUsername(c) || name === (c.env.ADMIN_USERNAME || "").trim()) {
            return c.text(msgs.SubAdminUsernameReservedMsg, 400);
        }
        try {
            await c.env.DB.prepare(
                `UPDATE sub_admins SET username = ?, updated_at = datetime('now') WHERE id = ?`
            ).bind(name, id).run();
        } catch (e) {
            const message = (e as Error).message || "";
            if (message.includes("UNIQUE")) {
                return c.text(msgs.SubAdminUsernameExistsMsg, 400);
            }
            return c.text(`${msgs.OperationFailedMsg}: ${message}`, 500);
        }
    }
    if (typeof password === "string" && password.length > 0) {
        await c.env.DB.prepare(
            `UPDATE sub_admins SET password = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(password, id).run();
    }
    if (typeof enabled === "boolean" || enabled === 0 || enabled === 1) {
        const enabledValue = enabled === 0 || enabled === false ? 0 : 1;
        await c.env.DB.prepare(
            `UPDATE sub_admins SET enabled = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(enabledValue, id).run();
    }
    if (typeof username === "string") {
        await ensureAddressGroupTables(c.env.DB);
        await ensureDefaultOwnerGroups(c);
    }
    return c.json({ success: true });
}

const deleteSubAdmin = async (c: Context<HonoCustomType>) => {
    const msgs = i18n.getMessagesbyContext(c);
    const { id } = c.req.param();
    const existing = await c.env.DB.prepare(
        `SELECT id FROM sub_admins WHERE id = ?`
    ).bind(id).first("id");
    if (!existing) {
        return c.text(msgs.SubAdminNotFoundMsg, 404);
    }
    try {
        const owned = await c.env.DB.prepare(
            `SELECT COUNT(*) as count FROM address`
            + ` WHERE owner_admin_id = ? AND owner_admin_type = 'sub'`
        ).bind(id).first<number>("count");
        if (owned) {
            return c.text(msgs.SubAdminHasAddressesMsg, 400);
        }
    } catch (e) {
        const message = (e as Error).message || "";
        if (!(message.includes("owner_admin_id") || message.includes("no such column"))) {
            return c.text(`${msgs.OperationFailedMsg}: ${message}`, 500);
        }
    }
    const { success } = await c.env.DB.prepare(
        `DELETE FROM sub_admins WHERE id = ?`
    ).bind(id).run();
    if (!success) {
        return c.text(msgs.OperationFailedMsg, 500);
    }
    await ensureAddressGroupTables(c.env.DB);
    await ensureDefaultOwnerGroups(c);
    return c.json({ success: true });
}

const adjustQuota = async (c: Context<HonoCustomType>) => {
    const msgs = i18n.getMessagesbyContext(c);
    const { id } = c.req.param();
    const { delta, reason } = await c.req.json();
    const amount = Math.floor(Number(delta));
    if (!Number.isFinite(amount) || amount === 0) {
        return c.text(msgs.InvalidQuotaDeltaMsg, 400);
    }
    const existing = await c.env.DB.prepare(
        `SELECT id, quota_balance FROM sub_admins WHERE id = ?`
    ).bind(id).first<{ id: number, quota_balance: number }>();
    if (!existing) {
        return c.text(msgs.SubAdminNotFoundMsg, 404);
    }
    const updated = await c.env.DB.prepare(
        `UPDATE sub_admins SET quota_balance = quota_balance + ?, updated_at = datetime('now')`
        + ` WHERE id = ? AND quota_balance + ? >= 0`
    ).bind(amount, id, amount).run();
    if (Number(updated.meta?.changes ?? 0) === 0) {
        return c.text(msgs.InsufficientQuotaMsg, 400);
    }
    try {
        await c.env.DB.prepare(
            `INSERT INTO sub_admin_quota_ledger (sub_admin_id, delta, reason)`
            + ` VALUES (?, ?, ?)`
        ).bind(id, amount, typeof reason === "string" ? reason : "recharge").run();
    } catch (e) {
        try {
            await c.env.DB.prepare(
                `UPDATE sub_admins SET quota_balance = quota_balance - ?, updated_at = datetime('now')`
                + ` WHERE id = ?`
            ).bind(amount, id).run();
        } catch (refundError) {
            console.error("Failed to roll back quota adjust", refundError);
        }
        const message = (e as Error).message || "";
        return c.text(`${msgs.OperationFailedMsg}: ${message}`, 500);
    }
    const row = await c.env.DB.prepare(
        `SELECT id, username, enabled, quota_balance, created_at, updated_at`
        + ` FROM sub_admins WHERE id = ?`
    ).bind(id).first<SubAdminRow>();
    return c.json({ success: true, result: row });
}

const listLedger = async (c: Context<HonoCustomType>) => {
    const msgs = i18n.getMessagesbyContext(c);
    const { id } = c.req.param();
    const existing = await c.env.DB.prepare(
        `SELECT id FROM sub_admins WHERE id = ?`
    ).bind(id).first("id");
    if (!existing) {
        return c.text(msgs.SubAdminNotFoundMsg, 404);
    }
    const { results } = await c.env.DB.prepare(
        `SELECT id, sub_admin_id, delta, reason, address_id, created_at`
        + ` FROM sub_admin_quota_ledger WHERE sub_admin_id = ?`
        + ` ORDER BY id DESC LIMIT 200`
    ).bind(id).all();
    return c.json({ results: results || [] });
}

const getDomainCreateCosts = async (c: Context<HonoCustomType>) => {
    const costs = await getJsonSetting<DomainCreateCosts>(
        c, CONSTANTS.DOMAIN_CREATE_COSTS_KEY
    ) || {};
    const rawExpire = await getSetting(c, CONSTANTS.DEFAULT_ADDRESS_EXPIRE_DAYS_KEY);
    let defaultAddressExpireDays: number | null = null;
    if (rawExpire) {
        try {
            defaultAddressExpireDays = parseExpireDaysSetting(JSON.parse(rawExpire));
        } catch {
            defaultAddressExpireDays = parseExpireDaysSetting(rawExpire);
        }
    }
    return c.json({
        domain_create_costs: costs,
        default_address_expire_days: defaultAddressExpireDays,
    });
}

const saveDomainCreateCosts = async (c: Context<HonoCustomType>) => {
    const msgs = i18n.getMessagesbyContext(c);
    const body = await c.req.json();
    const rawCosts = body.domain_create_costs ?? body.costs;
    const costsInput = rawCosts ?? (() => {
        const copy = { ...(body as Record<string, unknown>) };
        delete copy.default_address_expire_days;
        delete copy.domain_create_costs;
        delete copy.costs;
        return copy;
    })();
    const costs = normalizeDomainCreateCosts(costsInput);
    await saveSetting(c, CONSTANTS.DOMAIN_CREATE_COSTS_KEY, JSON.stringify(costs));
    if (Object.prototype.hasOwnProperty.call(body, "default_address_expire_days")) {
        const days = parseExpireDaysSetting(body.default_address_expire_days);
        if (body.default_address_expire_days != null && days == null) {
            return c.text(msgs.InvalidExpireDaysMsg, 400);
        }
        if (days == null) {
            await c.env.DB.prepare(
                `DELETE FROM settings WHERE key = ?`
            ).bind(CONSTANTS.DEFAULT_ADDRESS_EXPIRE_DAYS_KEY).run();
        } else {
            await saveSetting(
                c,
                CONSTANTS.DEFAULT_ADDRESS_EXPIRE_DAYS_KEY,
                JSON.stringify(days)
            );
        }
    }
    return c.json({ success: true, domain_create_costs: costs });
}

export default {
    listSubAdmins,
    createSubAdmin,
    updateSubAdmin,
    deleteSubAdmin,
    adjustQuota,
    listLedger,
    getDomainCreateCosts,
    saveDomainCreateCosts,
}
