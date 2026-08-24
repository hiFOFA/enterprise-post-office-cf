import { Context } from 'hono'
import { Jwt } from 'hono/utils/jwt'

import i18n from '../i18n'
import { getBooleanValue, getJsonSetting, getSetting } from '../utils'
import { newAddress, unbindAddressSideEffects } from '../common'
import { CONSTANTS } from '../constants'
import {
    getAdminPayload,
    requireOwnedAddressById,
} from '../admin_auth'
import {
    parseExpireDaysSetting,
    resolveExpireDays,
    type DomainCreateCosts,
} from '../admin_quota'
import {
    actorFromAdmin,
    addOwnedGroupMember,
    cleanupAddressGroupData,
    ensureAddressGroupTables,
    requireOwnedGroup,
    upsertAddressNote,
} from '../address_groups'
import { buildAdminSourceMeta, normalizeNote, parseOptionalGroupId } from '../address_meta'
import { extractApiToken } from '../api_token_scopes'
import { addAddressToDefaultOwnerGroup } from '../default_owner_groups_sync'

const listAddresses = async (c: Context<HonoCustomType>) => {
    const { limit, offset, query, sort_by, sort_order, group_id } = c.req.query();
    await ensureAddressGroupTables(c.env.DB);
    const allowedSortColumns: Record<string, string> = {
        'id': 'a.id',
        'name': 'a.name',
        'created_at': 'a.created_at',
        'updated_at': 'a.updated_at',
        'source_meta': 'a.source_meta',
        'expires_at': 'a.expires_at',
        'owner_admin_id': 'a.owner_admin_id',
        'mail_count': 'mail_count',
        'send_count': 'send_count',
    };
    const sortColumn = Object.hasOwn(allowedSortColumns, sort_by) ? allowedSortColumns[sort_by] : 'a.id';
    const sortDirection = sort_order === 'ascend' ? 'asc' : 'desc';
    const orderBy = `${sortColumn} ${sortDirection}`;
    const admin = getAdminPayload(c);
    const ownerSelect = `, CASE`
        + ` WHEN a.owner_admin_type = 'main' THEN ?`
        + ` ELSE sa.username END AS owner_username`;
    const mainUsername = admin?.role === 'main'
        ? (admin.username || 'main')
        : (c.env.ADMIN_USERNAME || 'main');
    const ownerJoin = ` LEFT JOIN sub_admins sa ON a.owner_admin_type = 'sub' AND a.owner_admin_id = sa.id`;
    const filters: string[] = [];
    const filterParams: string[] = [];
    if (admin?.role === 'sub' && admin.sub_admin_id) {
        filters.push(`a.owner_admin_id = ? AND a.owner_admin_type = 'sub'`);
        filterParams.push(String(admin.sub_admin_id));
    }
    if (query) {
        const useInstr = new TextEncoder().encode(query).length + 2 > 50;
        filters.push(useInstr ? `instr(a.name, ?) > 0` : `a.name like ?`);
        filterParams.push(useInstr ? query : `%${query}%`);
    }
    const actor = actorFromAdmin(c);
    if (group_id) {
        filters.push(
            `a.id IN (SELECT m.address_id FROM address_group_members m`
            + ` JOIN address_groups g ON g.id = m.group_id`
            + ` WHERE m.group_id = ? AND g.actor_type = ? AND g.actor_id = ?)`
        );
        filterParams.push(String(group_id), actor?.type || "main", actor?.id || "main");
    }
    const whereSql = filters.length > 0 ? ` where ${filters.join(' AND ')}` : '';
    const msgs = i18n.getMessagesbyContext(c);
    const parsedLimit = typeof limit === "string" ? parseInt(limit) : Number(limit);
    const parsedOffset = typeof offset === "string" ? parseInt(offset) : Number(offset);
    if (!parsedLimit || parsedLimit < 0 || parsedLimit > 100) {
        return c.text(msgs.InvalidLimitMsg, 400)
    }
    if (parsedOffset == null || Number.isNaN(parsedOffset) || parsedOffset < 0) {
        return c.text(msgs.InvalidOffsetMsg, 400)
    }
    const noteJoin = ` LEFT JOIN address_notes n ON n.address_id = a.id AND n.actor_type = ? AND n.actor_id = ?`;
    const resultsQuery = `SELECT a.*${ownerSelect}, n.note AS note,`
        + ` (SELECT COUNT(*) FROM raw_mails WHERE address = a.name) AS mail_count,`
        + ` (SELECT COUNT(*) FROM sendbox WHERE address = a.name) AS send_count`
        + ` FROM address a${ownerJoin}${noteJoin}${whereSql}`
        + ` order by ${orderBy} limit ? offset ?`;
    const { results } = await c.env.DB.prepare(resultsQuery).bind(
        mainUsername,
        actor?.type || "main",
        actor?.id || "main",
        ...filterParams,
        parsedLimit,
        parsedOffset
    ).all();
    const count = parsedOffset == 0 ? await c.env.DB.prepare(
        `SELECT count(*) as count FROM address a${whereSql}`
    ).bind(...filterParams).first("count") : 0;
    const filteredResults = (results || []).map((row) => {
        const next = { ...row } as Record<string, unknown>;
        delete next.password;
        return next;
    });
    return c.json({ results: filteredResults, count });
};

const createNewAddress = async (c: Context<HonoCustomType>) => {
    const { name, domain, enablePrefix, enableRandomSubdomain, expire_days, note, group_id } = await c.req.json();
    const msgs = i18n.getMessagesbyContext(c);
    if (!name) {
        return c.text(msgs.RequiredFieldMsg, 400)
    }
    let selectedGroupId: number | null = null;
    try {
        selectedGroupId = parseOptionalGroupId(group_id);
    } catch {
        return c.text(msgs.InvalidGroupIdMsg, 400);
    }
    const actor = actorFromAdmin(c);
    if (selectedGroupId) {
        if (!actor) return c.text(msgs.InvalidGroupIdMsg, 400);
        const owned = await requireOwnedGroup(c, actor, selectedGroupId);
        if (owned instanceof Response) return owned;
    }
    const admin = getAdminPayload(c);
    const isSub = admin?.role === 'sub';
    try {
        const costs = await getJsonSetting<DomainCreateCosts>(c, CONSTANTS.DOMAIN_CREATE_COSTS_KEY);
        const defaultExpireRaw = await getSetting(c, CONSTANTS.DEFAULT_ADDRESS_EXPIRE_DAYS_KEY);
        let defaultExpireDays: number | null = null;
        if (defaultExpireRaw) {
            try {
                defaultExpireDays = parseExpireDaysSetting(JSON.parse(defaultExpireRaw));
            } catch {
                defaultExpireDays = parseExpireDaysSetting(defaultExpireRaw);
            }
        }
        const expireDays = resolveExpireDays(expire_days, defaultExpireDays, !!isSub);
        const owner = {
            ownerAdminId: isSub ? (admin?.sub_admin_id ?? null) : null,
            ownerAdminType: (isSub ? 'sub' : 'main') as 'main' | 'sub',
            expireDays,
            quota: isSub && admin?.sub_admin_id
                ? { subAdminId: admin.sub_admin_id, costs }
                : null,
        };
        const res = await newAddress(c, {
            name, domain, enablePrefix,
            enableRandomSubdomain: getBooleanValue(enableRandomSubdomain),
            checkLengthByConfig: false,
            addressPrefix: null,
            checkAllowDomains: false,
            enableCheckNameRegex: false,
            sourceMeta: buildAdminSourceMeta(
                admin?.username || 'main',
                Boolean(extractApiToken(c.req.header("Authorization")))
            ),
            owner,
        });
        const trimmedNote = normalizeNote(note);
        if (actor && res.address_id && trimmedNote) {
            await upsertAddressNote(c, actor, Number(res.address_id), trimmedNote);
        }
        await ensureAddressGroupTables(c.env.DB);
        if (res.address_id) {
            await addAddressToDefaultOwnerGroup(
                c,
                Number(res.address_id),
                owner.ownerAdminType,
                owner.ownerAdminId
            );
            if (selectedGroupId && actor) {
                const groupError = await addOwnedGroupMember(
                    c,
                    actor,
                    selectedGroupId,
                    Number(res.address_id)
                );
                if (groupError) return groupError;
            }
        }
        return c.json({ ...res, note: trimmedNote, group_id: selectedGroupId });
    } catch (e) {
        const message = (e as Error).message;
        if (
            message === msgs.InsufficientQuotaMsg
            || message === msgs.AddressAlreadyRegisteredMsg
            || message === msgs.InvalidExpireDaysMsg
            || message === "InvalidExpireDaysMsg"
            || message === "InvalidGroupId"
        ) {
            if (message === "InvalidExpireDaysMsg") {
                return c.text(msgs.InvalidExpireDaysMsg, 400);
            }
            if (message === "InvalidGroupId") {
                return c.text(msgs.InvalidGroupIdMsg, 400);
            }
            return c.text(message, 400);
        }
        return c.text(`${msgs.FailedCreateAddressMsg}: ${message}`, 400)
    }
};

const deleteAddress = async (c: Context<HonoCustomType>) => {
    const msgs = i18n.getMessagesbyContext(c);
    const { id } = c.req.param();
    const denied = await requireOwnedAddressById(c, id);
    if (denied) return denied;
    const addressName = await c.env.DB.prepare(
        `SELECT name FROM address WHERE id = ?`
    ).bind(id).first<string>("name");
    if (addressName) {
        // same Telegram / per-address webhook unbind as expired cleanup
        await unbindAddressSideEffects(c, addressName);
    }
    await cleanupAddressGroupData(c.env.DB, id);
    // single batch runs as one transaction: rows keyed by address name are
    // deleted first and the address row last, so the name subqueries still
    // resolve and a failed statement rolls back the whole deletion
    const results = await c.env.DB.batch([
        c.env.DB.prepare(
            `DELETE FROM raw_mails WHERE address IN`
            + ` (select name from address where id = ?) `
        ).bind(id),
        c.env.DB.prepare(
            `DELETE FROM address_sender WHERE address IN`
            + ` (select name from address where id = ?) `
        ).bind(id),
        c.env.DB.prepare(
            `DELETE FROM sendbox WHERE address IN`
            + ` (select name from address where id = ?) `
        ).bind(id),
        c.env.DB.prepare(
            `DELETE FROM auto_reply_mails WHERE address IN`
            + ` (select name from address where id = ?) `
        ).bind(id),
        c.env.DB.prepare(
            `DELETE FROM users_address WHERE address_id = ?`
        ).bind(id),
        c.env.DB.prepare(
            `DELETE FROM address WHERE id = ? `
        ).bind(id),
    ]);
    const success = results.every((result) => result.success);
    if (!success) {
        return c.text(msgs.OperationFailedMsg, 500)
    }
    return c.json({ success })
};

const clearInbox = async (c: Context<HonoCustomType>) => {
    const msgs = i18n.getMessagesbyContext(c);
    const { id } = c.req.param();
    const denied = await requireOwnedAddressById(c, id);
    if (denied) return denied;
    const { success: mailSuccess } = await c.env.DB.prepare(
        `DELETE FROM raw_mails WHERE address IN`
        + ` (select name from address where id = ?) `
    ).bind(id).run();
    if (!mailSuccess) {
        return c.text(msgs.OperationFailedMsg, 500)
    }
    return c.json({ success: mailSuccess });
};

const clearSentItems = async (c: Context<HonoCustomType>) => {
    const msgs = i18n.getMessagesbyContext(c);
    const { id } = c.req.param();
    const denied = await requireOwnedAddressById(c, id);
    if (denied) return denied;
    const { success: sendboxSuccess } = await c.env.DB.prepare(
        `DELETE FROM sendbox WHERE address IN`
        + ` (select name from address where id = ?) `
    ).bind(id).run();
    if (!sendboxSuccess) {
        return c.text(msgs.OperationFailedMsg, 500)
    }
    return c.json({ success: sendboxSuccess });
};

const showPassword = async (c: Context<HonoCustomType>) => {
    const { id } = c.req.param();
    const denied = await requireOwnedAddressById(c, id);
    if (denied) return denied;
    const name = await c.env.DB.prepare(
        `SELECT name FROM address WHERE id = ? `
    ).bind(id).first("name");
    const jwt = await Jwt.sign({
        address: name,
        address_id: id
    }, c.env.JWT_SECRET, "HS256")
    return c.json({ jwt });
};

const resetPassword = async (c: Context<HonoCustomType>) => {
    const msgs = i18n.getMessagesbyContext(c);
    const { id } = c.req.param();
    const denied = await requireOwnedAddressById(c, id);
    if (denied) return denied;
    const { password } = await c.req.json();
    // NOTE: Keep the admin API field as password, but the value is a frontend SHA-256 hash.
    if (!getBooleanValue(c.env.ENABLE_ADDRESS_PASSWORD)) {
        return c.text(msgs.PasswordChangeDisabledMsg, 403);
    }
    if (!password) {
        return c.text(msgs.NewPasswordRequiredMsg, 400);
    }
    const { success } = await c.env.DB.prepare(
        `UPDATE address SET password = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(password, id).run();
    if (!success) {
        return c.text(msgs.FailedUpdatePasswordMsg, 500);
    }
    return c.json({ success: true });
};

export default {
    listAddresses, createNewAddress, deleteAddress, clearInbox, clearSentItems,
    showPassword, resetPassword
};
