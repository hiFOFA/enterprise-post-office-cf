import { Context } from "hono";
import { Jwt } from "hono/utils/jwt";

import { CONSTANTS } from "./constants";
import i18n from "./i18n";
import { getAdminPasswords } from "./utils";

const nowSeconds = (): number => Math.floor(Date.now() / 1000);

const looksLikeJwt = (value: string): boolean => {
    const parts = value.split(".");
    return parts.length === 3 && parts.every((part) => part.length > 0);
}

export const getMainAdminUsername = (c: Context<HonoCustomType>): string => {
    const username = (c.env.ADMIN_USERNAME || "").trim();
    return username || "main";
}

export const signAdminJwt = async (
    c: Context<HonoCustomType>,
    payload: Pick<AdminPayload, "role" | "username" | "sub_admin_id">
): Promise<string> => {
    const iat = nowSeconds();
    const tokenPayload: AdminPayload = {
        typ: "admin",
        role: payload.role,
        username: payload.username,
        iat,
        exp: iat + CONSTANTS.ADMIN_JWT_TTL_SECONDS,
    };
    if (payload.role === "sub" && payload.sub_admin_id) {
        tokenPayload.sub_admin_id = payload.sub_admin_id;
    }
    return await Jwt.sign(tokenPayload, c.env.JWT_SECRET, "HS256");
}

const loadEnabledSubAdmin = async (
    c: Context<HonoCustomType>,
    subAdminId: number
): Promise<{ id: number, username: string } | null> => {
    const row = await c.env.DB.prepare(
        `SELECT id, username, enabled FROM sub_admins WHERE id = ?`
    ).bind(subAdminId).first<{ id: number, username: string, enabled: number }>();
    if (!row || !row.enabled) {
        return null;
    }
    return { id: row.id, username: row.username };
}

export const authenticateAdmin = async (
    c: Context<HonoCustomType>
): Promise<AdminPayload | null> => {
    const auth = c.req.raw.headers.get("x-admin-auth");
    if (!auth) {
        return null;
    }

    try {
        const payload = await Jwt.verify(auth, c.env.JWT_SECRET, "HS256") as AdminPayload;
        if (payload?.typ !== "admin") {
            return null;
        }
        if (!payload.exp || payload.exp < nowSeconds()) {
            return null;
        }
        if (payload.role === "sub") {
            if (!payload.sub_admin_id) {
                return null;
            }
            const subAdmin = await loadEnabledSubAdmin(c, payload.sub_admin_id);
            if (!subAdmin) {
                return null;
            }
            return {
                typ: "admin",
                role: "sub",
                username: subAdmin.username,
                sub_admin_id: subAdmin.id,
                exp: payload.exp,
                iat: payload.iat,
            };
        }
        return {
            typ: "admin",
            role: "main",
            username: typeof payload.username === "string" && payload.username
                ? payload.username
                : getMainAdminUsername(c),
            exp: payload.exp,
            iat: payload.iat,
        };
    } catch (e) {
        if (looksLikeJwt(auth)) {
            // Expired / invalid admin JWT should not be treated as a password,
            // but a plaintext password may contain dots — fall through.
            try {
                const payloadPart = auth.split(".")[1] || "";
                const b64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
                const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
                const decoded = JSON.parse(atob(padded));
                if (decoded?.typ === "admin") {
                    return null;
                }
            } catch {
                // not a readable JWT payload, try password fallback
            }
        }
    }

    const adminPasswords = getAdminPasswords(c);
    if (adminPasswords.includes(auth)) {
        return {
            role: "main",
            username: getMainAdminUsername(c),
        };
    }
    return null;
}

export const getAdminPayload = (c: Context<HonoCustomType>): AdminPayload | null => {
    try {
        return c.get("adminPayload") || null;
    } catch {
        return null;
    }
}

export const isSubAdmin = (c: Context<HonoCustomType>): boolean => {
    return getAdminPayload(c)?.role === "sub";
}

export const requireOwnedAddressById = async (
    c: Context<HonoCustomType>,
    addressId: string | number
): Promise<Response | null> => {
    const admin = getAdminPayload(c);
    if (!admin || admin.role !== "sub") {
        return null;
    }
    const msgs = i18n.getMessagesbyContext(c);
    const row = await c.env.DB.prepare(
        `SELECT id FROM address WHERE id = ? AND owner_admin_id = ? AND owner_admin_type = 'sub'`
    ).bind(addressId, admin.sub_admin_id).first("id");
    if (!row) {
        return c.text(msgs.ForbiddenForSubAdminMsg, 403);
    }
    return null;
}

export const requireOwnedAddressByName = async (
    c: Context<HonoCustomType>,
    addressName: string
): Promise<Response | null> => {
    const admin = getAdminPayload(c);
    if (!admin || admin.role !== "sub") {
        return null;
    }
    const msgs = i18n.getMessagesbyContext(c);
    const row = await c.env.DB.prepare(
        `SELECT id FROM address WHERE name = ? AND owner_admin_id = ? AND owner_admin_type = 'sub'`
    ).bind(addressName, admin.sub_admin_id).first("id");
    if (!row) {
        return c.text(msgs.ForbiddenForSubAdminMsg, 403);
    }
    return null;
}

export const subAdminAddressOwnerSql = (
    c: Context<HonoCustomType>
): { clause: string, params: (string | number)[] } => {
    const admin = getAdminPayload(c);
    if (!admin || admin.role !== "sub" || !admin.sub_admin_id) {
        return { clause: "", params: [] };
    }
    return {
        clause: `a.owner_admin_id = ? AND a.owner_admin_type = 'sub'`,
        params: [admin.sub_admin_id],
    };
}
