import { Context } from "hono";

import { d1Run } from "./d1_sql";
import {
    authorizeApiTokenRequest,
    buildTokenCreatePayload,
    catalogForRole,
    extractApiToken,
    type TokenRole,
} from "./api_token_scopes";
import { generateApiToken, hashApiToken } from "./api_token_crypto";
import { getAdminPayload, getMainAdminUsername } from "./admin_auth";
import { ADDRESS_ACTIVE_SQL } from "./common";
import i18n from "./i18n";

export { generateApiToken, hashApiToken } from "./api_token_crypto";
export { buildTokenCreatePayload } from "./api_token_scopes";

export type TokenActor = {
    type: TokenRole;
    id: string;
};

export const API_TOKENS_SQL = `CREATE TABLE IF NOT EXISTS api_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_type TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    name TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    token_prefix TEXT NOT NULL,
    scopes TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used_at DATETIME,
    revoked_at DATETIME
)`;

let tablesReady = false;

export const ensureApiTokenTables = async (db: D1Database): Promise<void> => {
    if (tablesReady) return;
    await d1Run(db, API_TOKENS_SQL);
    await d1Run(db, `CREATE INDEX IF NOT EXISTS idx_api_tokens_actor ON api_tokens(actor_type, actor_id)`);
    await d1Run(db, `CREATE INDEX IF NOT EXISTS idx_api_tokens_hash ON api_tokens(token_hash)`);
    tablesReady = true;
};

type TokenRow = {
    id: number;
    name: string;
    token_prefix: string;
    scopes: string;
    created_at: string;
    last_used_at: string | null;
};

const parseScopes = (raw: string): string[] => {
    try {
        const value = JSON.parse(raw);
        return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
    } catch {
        return [];
    }
};

const publicToken = (row: TokenRow) => ({
    id: row.id,
    name: row.name,
    prefix: row.token_prefix,
    scopes: parseScopes(row.scopes),
    created_at: row.created_at,
    last_used_at: row.last_used_at,
});

export const actorFromAdmin = (c: Context<HonoCustomType>): TokenActor | null => {
    const admin = getAdminPayload(c);
    if (!admin) return null;
    if (admin.role === "sub" && admin.sub_admin_id) {
        return { type: "sub", id: String(admin.sub_admin_id) };
    }
    return { type: "main", id: getMainAdminUsername(c) };
};

export const actorFromAddressJwt = (payload: { address_id?: number | string }): TokenActor => ({
    type: "user",
    id: String(payload.address_id || ""),
});

export const getTokenCatalog = (actor: TokenActor) => ({
    role: actor.type,
    catalog: catalogForRole(actor.type),
});

export const listApiTokens = async (c: Context<HonoCustomType>, actor: TokenActor): Promise<Response> => {
    await ensureApiTokenTables(c.env.DB);
    const { results } = await c.env.DB.prepare(
        `SELECT id, name, token_prefix, scopes, created_at, last_used_at`
        + ` FROM api_tokens WHERE actor_type = ? AND actor_id = ? AND revoked_at IS NULL`
        + ` ORDER BY id DESC`
    ).bind(actor.type, actor.id).all<TokenRow>();
    return c.json({ results: (results || []).map(publicToken) });
};

export const createApiToken = async (c: Context<HonoCustomType>, actor: TokenActor): Promise<Response> => {
    const msgs = i18n.getMessagesbyContext(c);
    await ensureApiTokenTables(c.env.DB);
    const body = await c.req.json().catch(() => ({})) as { name?: string; scopes?: string[] };
    let payload: { name: string; scopes: string[] };
    try {
        payload = buildTokenCreatePayload(actor.type, body.name || "", body.scopes || []);
    } catch {
        return c.text(msgs.RequiredFieldMsg, 400);
    }
    const generated = await generateApiToken();
    const inserted = await c.env.DB.prepare(
        `INSERT INTO api_tokens (actor_type, actor_id, name, token_hash, token_prefix, scopes)`
        + ` VALUES (?, ?, ?, ?, ?, ?)`
        + ` RETURNING id, name, token_prefix, scopes, created_at, last_used_at`
    ).bind(
        actor.type,
        actor.id,
        payload.name,
        generated.hash,
        generated.prefix,
        JSON.stringify(payload.scopes)
    ).first<TokenRow>();
    if (!inserted) return c.text(msgs.OperationFailedMsg, 500);
    return c.json({
        ...publicToken(inserted),
        token: generated.token,
    });
};

export const revokeApiToken = async (c: Context<HonoCustomType>, actor: TokenActor): Promise<Response> => {
    const msgs = i18n.getMessagesbyContext(c);
    await ensureApiTokenTables(c.env.DB);
    const id = Number(c.req.param("id"));
    if (!Number.isFinite(id) || id < 1) return c.text(msgs.ApiTokenNotFoundMsg, 404);
    const { success, meta } = await c.env.DB.prepare(
        `UPDATE api_tokens SET revoked_at = datetime('now')`
        + ` WHERE id = ? AND actor_type = ? AND actor_id = ? AND revoked_at IS NULL`
    ).bind(id, actor.type, actor.id).run();
    if (!success || !meta?.changes) return c.text(msgs.ApiTokenNotFoundMsg, 404);
    return c.json({ success: true });
};

export type ResolvedApiToken = {
    id: number;
    actor: TokenActor;
    scopes: string[];
};

export const findValidApiToken = async (
    db: D1Database,
    token: string
): Promise<ResolvedApiToken | null> => {
    await ensureApiTokenTables(db);
    const hash = await hashApiToken(token);
    const row = await db.prepare(
        `SELECT id, actor_type, actor_id, scopes FROM api_tokens`
        + ` WHERE token_hash = ? AND revoked_at IS NULL`
    ).bind(hash).first<{
        id: number;
        actor_type: TokenRole;
        actor_id: string;
        scopes: string;
    }>();
    if (!row) return null;
    if (row.actor_type !== "main" && row.actor_type !== "sub" && row.actor_type !== "user") {
        return null;
    }
    return {
        id: row.id,
        actor: { type: row.actor_type, id: row.actor_id },
        scopes: parseScopes(row.scopes),
    };
};

export const touchApiTokenLastUsed = async (db: D1Database, id: number): Promise<void> => {
    await db.prepare(
        `UPDATE api_tokens SET last_used_at = datetime('now') WHERE id = ?`
    ).bind(id).run();
};

const applyUserApiToken = async (
    c: Context<HonoCustomType>,
    token: ResolvedApiToken
): Promise<Response | null> => {
    const msgs = i18n.getMessagesbyContext(c);
    if (token.actor.type !== "user" || !token.actor.id) {
        return c.text(msgs.ApiTokenInvalidMsg, 401);
    }
    let row: { id: number; name: string } | null = null;
    try {
        row = await c.env.DB.prepare(
            `SELECT id, name FROM address WHERE id = ? AND ${ADDRESS_ACTIVE_SQL}`
        ).bind(token.actor.id).first<{ id: number; name: string }>();
    } catch (e) {
        const message = (e as Error).message || "";
        if (message.includes("expires_at") || message.includes("no such column")) {
            row = await c.env.DB.prepare(
                `SELECT id, name FROM address WHERE id = ?`
            ).bind(token.actor.id).first<{ id: number; name: string }>();
        } else {
            throw e;
        }
    }
    if (!row?.name) return c.text(msgs.ApiTokenInvalidMsg, 401);
    c.set("jwtPayload", { address: row.name, address_id: row.id });
    return null;
};

const applyAdminApiToken = async (
    c: Context<HonoCustomType>,
    token: ResolvedApiToken
): Promise<Response | null> => {
    const msgs = i18n.getMessagesbyContext(c);
    if (token.actor.type === "sub") {
        const subId = Number(token.actor.id);
        if (!Number.isFinite(subId) || subId < 1) {
            return c.text(msgs.ApiTokenInvalidMsg, 401);
        }
        const sub = await c.env.DB.prepare(
            `SELECT id, username, enabled FROM sub_admins WHERE id = ?`
        ).bind(subId).first<{ id: number; username: string; enabled: number }>();
        if (!sub || !sub.enabled) return c.text(msgs.ApiTokenInvalidMsg, 401);
        c.set("adminPayload", {
            typ: "admin",
            role: "sub",
            username: sub.username,
            sub_admin_id: sub.id,
        });
        return null;
    }
    if (token.actor.type !== "main") {
        return c.text(msgs.ApiTokenInvalidMsg, 401);
    }
    c.set("adminPayload", {
        typ: "admin",
        role: "main",
        username: token.actor.id || getMainAdminUsername(c),
    });
    return null;
};

export const tryAuthenticateApiToken = async (
    c: Context<HonoCustomType>,
    expected: "user" | "admin"
): Promise<Response | null | undefined> => {
    const raw = extractApiToken(c.req.raw.headers.get("authorization"));
    if (!raw) return undefined;
    const msgs = i18n.getMessagesbyContext(c);
    const token = await findValidApiToken(c.env.DB, raw);
    if (!token) return c.text(msgs.ApiTokenInvalidMsg, 401);
    const applied = expected === "user"
        ? await applyUserApiToken(c, token)
        : await applyAdminApiToken(c, token);
    if (applied) return applied;
    const decision = authorizeApiTokenRequest(token.scopes, c.req.method, c.req.path);
    if (decision !== "ok") return c.text(msgs.ApiTokenForbiddenMsg, 403);
    await touchApiTokenLastUsed(c.env.DB, token.id);
    return null;
};
