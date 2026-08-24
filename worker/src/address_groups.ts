import { Context } from "hono";

import { getAdminPayload, requireOwnedAddressById } from "./admin_auth";
import {
    canCreateMoreGroups,
    groupLimitFor,
    normalizeGroupLimits,
    normalizeGroupName,
    normalizeNote,
    type GroupActorType,
    type GroupLimits,
} from "./address_meta";
import { CONSTANTS } from "./constants";
import { d1Run } from "./d1_sql";
import i18n from "./i18n";
import { getJsonSetting, saveSetting } from "./utils";
import {
    isDefaultOwnerGroupId,
    parseDefaultOwnerGroupMap,
    type DefaultOwnerGroupMap,
} from "./default_owner_groups";
import { ensureDefaultOwnerGroups } from "./default_owner_groups_sync";

export type AddressActor = {
    type: GroupActorType;
    id: string;
};

export const ADDRESS_GROUPS_SQL = `CREATE TABLE IF NOT EXISTS address_groups (id INTEGER PRIMARY KEY AUTOINCREMENT, actor_type TEXT NOT NULL, actor_id TEXT NOT NULL, name TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`;
export const ADDRESS_GROUP_MEMBERS_SQL = `CREATE TABLE IF NOT EXISTS address_group_members (group_id INTEGER NOT NULL, address_id INTEGER NOT NULL, PRIMARY KEY (group_id, address_id))`;
export const ADDRESS_NOTES_SQL = `CREATE TABLE IF NOT EXISTS address_notes (actor_type TEXT NOT NULL, actor_id TEXT NOT NULL, address_id INTEGER NOT NULL, note TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (actor_type, actor_id, address_id))`;

let tablesReady = false;

export const ensureAddressGroupTables = async (db: D1Database): Promise<void> => {
    if (tablesReady) return;
    await d1Run(db, ADDRESS_GROUPS_SQL);
    await d1Run(db, `CREATE INDEX IF NOT EXISTS idx_address_groups_actor ON address_groups(actor_type, actor_id)`);
    await d1Run(db, ADDRESS_GROUP_MEMBERS_SQL);
    await d1Run(db, `CREATE INDEX IF NOT EXISTS idx_address_group_members_address ON address_group_members(address_id)`);
    await d1Run(db, ADDRESS_NOTES_SQL);
    await d1Run(db, `CREATE INDEX IF NOT EXISTS idx_address_notes_address ON address_notes(address_id)`);
    tablesReady = true;
};

export const actorFromAdmin = (c: Context<HonoCustomType>): AddressActor | null => {
    const admin = getAdminPayload(c);
    if (!admin) return null;
    if (admin.role === "sub" && admin.sub_admin_id) {
        return { type: "sub", id: String(admin.sub_admin_id) };
    }
    return { type: "main", id: "main" };
};

export const actorFromAddressJwt = (payload: { address_id?: number | string } | null | undefined): AddressActor | null => {
    if (!payload?.address_id) return null;
    return { type: "user", id: String(payload.address_id) };
};

export const loadGroupLimits = async (c: Context<HonoCustomType>): Promise<GroupLimits> => {
    const raw = await getJsonSetting<GroupLimits>(c, CONSTANTS.GROUP_LIMITS_KEY);
    return normalizeGroupLimits(raw);
};

const parseIdList = (raw: unknown): number[] => {
    const list = Array.isArray(raw) ? raw : [];
    const ids = new Set<number>();
    for (const item of list) {
        const id = Number(item);
        if (Number.isInteger(id) && id > 0) ids.add(id);
    }
    return [...ids];
};

export const requireOwnedGroup = async (
    c: Context<HonoCustomType>,
    actor: AddressActor,
    groupId: string | number
): Promise<{ id: number; name: string } | Response> => {
    const msgs = i18n.getMessagesbyContext(c);
    const id = Number(groupId);
    if (!Number.isInteger(id) || id <= 0) {
        return c.text(msgs.InvalidInputMsg, 400);
    }
    const row = await c.env.DB.prepare(
        `SELECT id, name FROM address_groups WHERE id = ? AND actor_type = ? AND actor_id = ?`
    ).bind(id, actor.type, actor.id).first<{ id: number; name: string }>();
    if (!row) {
        return c.text(msgs.GroupNotFoundMsg, 404);
    }
    return row;
};

const assertUsableAddresses = async (
    c: Context<HonoCustomType>,
    actor: AddressActor,
    addressIds: number[]
): Promise<Response | null> => {
    if (addressIds.length === 0) return null;
    const placeholders = addressIds.map(() => "?").join(",");
    const { results } = await c.env.DB.prepare(
        `SELECT id FROM address WHERE id IN (${placeholders})`
    ).bind(...addressIds).all<{ id: number }>();
    if ((results || []).length !== addressIds.length) {
        return c.text(i18n.getMessagesbyContext(c).AddressNotFoundMsg, 400);
    }
    if (actor.type === "sub") {
        for (const id of addressIds) {
            const denied = await requireOwnedAddressById(c, id);
            if (denied) return denied;
        }
    }
    return null;
};

export const addOwnedGroupMember = async (
    c: Context<HonoCustomType>,
    actor: AddressActor,
    groupId: number,
    addressId: number
): Promise<Response | null> => {
    const owned = await requireOwnedGroup(c, actor, groupId);
    if (owned instanceof Response) return owned;
    const usable = await assertUsableAddresses(c, actor, [addressId]);
    if (usable) return usable;
    await c.env.DB.prepare(
        `INSERT OR IGNORE INTO address_group_members (group_id, address_id) VALUES (?, ?)`
    ).bind(owned.id, addressId).run();
    return null;
};

export const upsertAddressNote = async (
    c: Context<HonoCustomType>,
    actor: AddressActor,
    addressId: number,
    rawNote: unknown
): Promise<Response> => {
    await ensureAddressGroupTables(c.env.DB);
    const msgs = i18n.getMessagesbyContext(c);
    if (!Number.isInteger(addressId) || addressId <= 0) {
        return c.text(msgs.InvalidAddressIdMsg, 400);
    }
    const usable = await assertUsableAddresses(c, actor, [addressId]);
    if (usable) return usable;
    const note = normalizeNote(rawNote);
    if (!note) {
        await c.env.DB.prepare(
            `DELETE FROM address_notes WHERE actor_type = ? AND actor_id = ? AND address_id = ?`
        ).bind(actor.type, actor.id, addressId).run();
        return c.json({ success: true, note: "" });
    }
    await c.env.DB.prepare(
        `INSERT INTO address_notes (actor_type, actor_id, address_id, note, updated_at)`
        + ` VALUES (?, ?, ?, ?, datetime('now'))`
        + ` ON CONFLICT(actor_type, actor_id, address_id)`
        + ` DO UPDATE SET note = excluded.note, updated_at = datetime('now')`
    ).bind(actor.type, actor.id, addressId, note).run();
    return c.json({ success: true, note });
};

export const listAddressNotes = async (
    c: Context<HonoCustomType>,
    actor: AddressActor
): Promise<Response> => {
    await ensureAddressGroupTables(c.env.DB);
    const { results } = await c.env.DB.prepare(
        `SELECT address_id, note FROM address_notes WHERE actor_type = ? AND actor_id = ?`
    ).bind(actor.type, actor.id).all<{ address_id: number; note: string }>();
    return c.json({ results: results || [] });
};

export const listAddressGroups = async (
    c: Context<HonoCustomType>,
    actor: AddressActor
): Promise<Response> => {
    await ensureAddressGroupTables(c.env.DB);
    let defaultMap: DefaultOwnerGroupMap = {};
    if (actor.type === "main" && actor.id === "main") {
        defaultMap = await ensureDefaultOwnerGroups(c);
    }
    const limits = await loadGroupLimits(c);
    const { results } = await c.env.DB.prepare(
        `SELECT g.id, g.name, g.created_at,`
        + ` (SELECT COUNT(*) FROM address_group_members m WHERE m.group_id = g.id) AS member_count`
        + ` FROM address_groups g WHERE g.actor_type = ? AND g.actor_id = ?`
        + ` ORDER BY g.id DESC`
    ).bind(actor.type, actor.id).all<{
        id: number;
        name: string;
        created_at: string;
        member_count: number;
    }>();
    const rows = results || [];
    const defaultIds = new Set(Object.values(defaultMap));
    const defaultOrder = Object.keys(defaultMap).sort((left, right) => {
        if (left === "main") return -1;
        if (right === "main") return 1;
        return Number(left.slice(4)) - Number(right.slice(4));
    });
    const orderedDefaults = defaultOrder
        .map((key) => rows.find((row) => row.id === defaultMap[key]))
        .filter((row): row is typeof rows[number] => Boolean(row));
    const customRows = rows.filter((row) => !defaultIds.has(row.id));
    const ordered = [...orderedDefaults, ...customRows];
    const used = ordered.length;
    return c.json({
        results: ordered,
        count: used,
        limits,
        max: groupLimitFor(actor.type, limits),
        used,
    });
};

export const createAddressGroup = async (
    c: Context<HonoCustomType>,
    actor: AddressActor
): Promise<Response> => {
    await ensureAddressGroupTables(c.env.DB);
    const msgs = i18n.getMessagesbyContext(c);
    const body = await c.req.json().catch(() => ({}));
    const name = normalizeGroupName((body as { name?: unknown }).name);
    if (!name) {
        return c.text(msgs.InvalidGroupNameMsg, 400);
    }
    const limits = await loadGroupLimits(c);
    const used = await c.env.DB.prepare(
        `SELECT COUNT(*) AS count FROM address_groups WHERE actor_type = ? AND actor_id = ?`
    ).bind(actor.type, actor.id).first<number>("count") || 0;
    if (!canCreateMoreGroups(actor.type, Number(used), limits)) {
        return c.text(msgs.GroupLimitReachedMsg, 400);
    }
    const result = await c.env.DB.prepare(
        `INSERT INTO address_groups (actor_type, actor_id, name) VALUES (?, ?, ?)`
    ).bind(actor.type, actor.id, name).run();
    return c.json({
        success: true,
        id: result.meta?.last_row_id,
        name,
    });
};

export const renameAddressGroup = async (
    c: Context<HonoCustomType>,
    actor: AddressActor
): Promise<Response> => {
    await ensureAddressGroupTables(c.env.DB);
    const msgs = i18n.getMessagesbyContext(c);
    const owned = await requireOwnedGroup(c, actor, c.req.param("id"));
    if (owned instanceof Response) return owned;
    const body = await c.req.json().catch(() => ({}));
    const name = normalizeGroupName((body as { name?: unknown }).name);
    if (!name) {
        return c.text(msgs.InvalidGroupNameMsg, 400);
    }
    await c.env.DB.prepare(
        `UPDATE address_groups SET name = ? WHERE id = ? AND actor_type = ? AND actor_id = ?`
    ).bind(name, owned.id, actor.type, actor.id).run();
    return c.json({ success: true, id: owned.id, name });
};

export const deleteAddressGroup = async (
    c: Context<HonoCustomType>,
    actor: AddressActor
): Promise<Response> => {
    await ensureAddressGroupTables(c.env.DB);
    const owned = await requireOwnedGroup(c, actor, c.req.param("id"));
    if (owned instanceof Response) return owned;
    if (actor.type === "main") {
        const map = parseDefaultOwnerGroupMap(
            await getJsonSetting(c, CONSTANTS.DEFAULT_OWNER_GROUPS_KEY)
        );
        if (isDefaultOwnerGroupId(map, owned.id)) {
            return c.text(i18n.getMessagesbyContext(c).DefaultOwnerGroupDeleteMsg, 400);
        }
    }
    await c.env.DB.batch([
        c.env.DB.prepare(`DELETE FROM address_group_members WHERE group_id = ?`).bind(owned.id),
        c.env.DB.prepare(
            `DELETE FROM address_groups WHERE id = ? AND actor_type = ? AND actor_id = ?`
        ).bind(owned.id, actor.type, actor.id),
    ]);
    return c.json({ success: true });
};

export const listAddressGroupMembers = async (
    c: Context<HonoCustomType>,
    actor: AddressActor
): Promise<Response> => {
    await ensureAddressGroupTables(c.env.DB);
    const owned = await requireOwnedGroup(c, actor, c.req.param("id"));
    if (owned instanceof Response) return owned;
    const { results } = await c.env.DB.prepare(
        `SELECT a.id, a.name, n.note`
        + ` FROM address_group_members m`
        + ` JOIN address a ON a.id = m.address_id`
        + ` LEFT JOIN address_notes n ON n.address_id = a.id AND n.actor_type = ? AND n.actor_id = ?`
        + ` WHERE m.group_id = ? ORDER BY a.id DESC`
    ).bind(actor.type, actor.id, owned.id).all();
    return c.json({ results: results || [] });
};

export const addAddressGroupMembers = async (
    c: Context<HonoCustomType>,
    actor: AddressActor
): Promise<Response> => {
    await ensureAddressGroupTables(c.env.DB);
    const owned = await requireOwnedGroup(c, actor, c.req.param("id"));
    if (owned instanceof Response) return owned;
    const body = await c.req.json().catch(() => ({}));
    const addressIds = parseIdList((body as { address_ids?: unknown }).address_ids);
    const usable = await assertUsableAddresses(c, actor, addressIds);
    if (usable) return usable;
    if (addressIds.length > 0) {
        await c.env.DB.batch(addressIds.map((addressId) => (
            c.env.DB.prepare(
                `INSERT OR IGNORE INTO address_group_members (group_id, address_id) VALUES (?, ?)`
            ).bind(owned.id, addressId)
        )));
    }
    return c.json({ success: true });
};

export const removeAddressGroupMembers = async (
    c: Context<HonoCustomType>,
    actor: AddressActor
): Promise<Response> => {
    await ensureAddressGroupTables(c.env.DB);
    const owned = await requireOwnedGroup(c, actor, c.req.param("id"));
    if (owned instanceof Response) return owned;
    const body = await c.req.json().catch(() => ({}));
    const addressIds = parseIdList((body as { address_ids?: unknown }).address_ids);
    if (addressIds.length > 0) {
        const placeholders = addressIds.map(() => "?").join(",");
        await c.env.DB.prepare(
            `DELETE FROM address_group_members WHERE group_id = ? AND address_id IN (${placeholders})`
        ).bind(owned.id, ...addressIds).run();
    }
    return c.json({ success: true });
};

export const getGroupLimitsHandler = async (c: Context<HonoCustomType>): Promise<Response> => {
    return c.json(await loadGroupLimits(c));
};

export const saveGroupLimitsHandler = async (c: Context<HonoCustomType>): Promise<Response> => {
    const admin = getAdminPayload(c);
    const msgs = i18n.getMessagesbyContext(c);
    if (!admin || admin.role !== "main") {
        return c.text(msgs.ForbiddenForSubAdminMsg, 403);
    }
    const body = await c.req.json().catch(() => ({}));
    const limits = normalizeGroupLimits(body);
    await saveSetting(c, CONSTANTS.GROUP_LIMITS_KEY, JSON.stringify(limits));
    return c.json({ success: true, ...limits });
};

export const cleanupAddressGroupData = async (db: D1Database, addressId: string | number): Promise<void> => {
    await ensureAddressGroupTables(db);
    await db.batch([
        db.prepare(`DELETE FROM address_group_members WHERE address_id = ?`).bind(addressId),
        db.prepare(`DELETE FROM address_notes WHERE address_id = ?`).bind(addressId),
    ]);
};
