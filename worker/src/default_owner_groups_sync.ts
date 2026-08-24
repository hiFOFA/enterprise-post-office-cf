import { Context } from "hono";

import { CONSTANTS } from "./constants";
import { getJsonSetting, saveSetting } from "./utils";
import {
    MAIN_GROUP_ACTOR,
    MAIN_OWNER_GROUP_KEY,
    buildDefaultOwnerGroupSpecs,
    ownerGroupKeyForAddress,
    parseDefaultOwnerGroupMap,
    type DefaultOwnerGroupMap,
} from "./default_owner_groups";

const chunk = <T>(items: T[], size: number): T[][] => {
    const result: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        result.push(items.slice(i, i + size));
    }
    return result;
};

export const ensureDefaultOwnerGroups = async (c: Context<HonoCustomType>): Promise<DefaultOwnerGroupMap> => {
    const { results: subAdmins } = await c.env.DB.prepare(
        `SELECT id, username FROM sub_admins ORDER BY id`
    ).all<{ id: number; username: string }>();
    const specs = buildDefaultOwnerGroupSpecs(subAdmins || []);
    const wantedKeys = new Set(specs.map((item) => item.key));
    let map = parseDefaultOwnerGroupMap(
        await getJsonSetting<DefaultOwnerGroupMap>(c, CONSTANTS.DEFAULT_OWNER_GROUPS_KEY)
    );

    for (const spec of specs) {
        const existingId = map[spec.key];
        if (existingId) {
            const row = await c.env.DB.prepare(
                `SELECT id, name FROM address_groups WHERE id = ? AND actor_type = ? AND actor_id = ?`
            ).bind(existingId, MAIN_GROUP_ACTOR.type, MAIN_GROUP_ACTOR.id).first<{ id: number; name: string }>();
            if (row) {
                if (row.name !== spec.name) {
                    await c.env.DB.prepare(
                        `UPDATE address_groups SET name = ? WHERE id = ?`
                    ).bind(spec.name, row.id).run();
                }
                continue;
            }
        }
        const created = await c.env.DB.prepare(
            `INSERT INTO address_groups (actor_type, actor_id, name) VALUES (?, ?, ?)`
        ).bind(MAIN_GROUP_ACTOR.type, MAIN_GROUP_ACTOR.id, spec.name).run();
        const id = Number(created.meta?.last_row_id);
        if (Number.isInteger(id) && id > 0) map[spec.key] = id;
    }

    for (const key of Object.keys(map)) {
        if (wantedKeys.has(key)) continue;
        const staleId = map[key];
        await c.env.DB.batch([
            c.env.DB.prepare(`DELETE FROM address_group_members WHERE group_id = ?`).bind(staleId),
            c.env.DB.prepare(
                `DELETE FROM address_groups WHERE id = ? AND actor_type = ? AND actor_id = ?`
            ).bind(staleId, MAIN_GROUP_ACTOR.type, MAIN_GROUP_ACTOR.id),
        ]);
        delete map[key];
    }

    const { results: addresses } = await c.env.DB.prepare(
        `SELECT id, owner_admin_type, owner_admin_id FROM address`
    ).all<{ id: number; owner_admin_type: string | null; owner_admin_id: number | null }>();
    const membersByKey = new Map<string, number[]>();
    for (const spec of specs) membersByKey.set(spec.key, []);
    for (const row of addresses || []) {
        const key = ownerGroupKeyForAddress(row.owner_admin_type, row.owner_admin_id);
        const list = membersByKey.get(key) || membersByKey.get(MAIN_OWNER_GROUP_KEY);
        if (list) list.push(row.id);
    }

    const inserts: D1PreparedStatement[] = [];
    for (const spec of specs) {
        const groupId = map[spec.key];
        if (!groupId) continue;
        for (const addressId of membersByKey.get(spec.key) || []) {
            inserts.push(c.env.DB.prepare(
                `INSERT OR IGNORE INTO address_group_members (group_id, address_id) VALUES (?, ?)`
            ).bind(groupId, addressId));
        }
    }
    for (const part of chunk(inserts, 40)) {
        if (part.length > 0) await c.env.DB.batch(part);
    }

    await saveSetting(c, CONSTANTS.DEFAULT_OWNER_GROUPS_KEY, JSON.stringify(map));
    return map;
};

export const addAddressToDefaultOwnerGroup = async (
    c: Context<HonoCustomType>,
    addressId: number,
    ownerType: string | null | undefined,
    ownerId: number | string | null | undefined
): Promise<void> => {
    if (!Number.isInteger(addressId) || addressId <= 0) return;
    let map = parseDefaultOwnerGroupMap(
        await getJsonSetting<DefaultOwnerGroupMap>(c, CONSTANTS.DEFAULT_OWNER_GROUPS_KEY)
    );
    const key = ownerGroupKeyForAddress(ownerType, ownerId);
    if (!map[key]) map = await ensureDefaultOwnerGroups(c);
    const groupId = map[key];
    if (!groupId) return;
    await c.env.DB.prepare(
        `INSERT OR IGNORE INTO address_group_members (group_id, address_id) VALUES (?, ?)`
    ).bind(groupId, addressId).run();
};
