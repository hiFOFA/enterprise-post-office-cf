import { Context } from "hono";
import { Jwt } from "hono/utils/jwt";

import { d1Run } from "./d1_sql";
import {
    AI_ADVISOR_PROVIDERS_SQL,
    executeCompletion,
    resolveCompletionTarget,
} from "./ai_advisor_config";
import { ADDRESS_ACTIVE_SQL, commonParseMail } from "./common";
import { resolveRawEmailRow } from "./gzip";
import i18n from "./i18n";
import { getAdminPayload, getMainAdminUsername } from "./admin_auth";
import type { RawMailRow } from "./models";

export type AdvisorActor = {
    type: "main" | "sub" | "user";
    id: string;
};

const MAX_ADDRESSES = 80;
const MAX_MAILS = 20;
const MAX_SNIPPET = 500;
const MAX_MESSAGE = 2000;
const MAX_HISTORY = 10;
const MAX_STORED_MESSAGES = 40;

let tablesReady = false;

export const ensureAiAdvisorTables = async (db: D1Database): Promise<void> => {
    if (tablesReady) return;
    // D1 exec() splits on newlines, so CREATE TABLE must be a single statement.
    await d1Run(db, `CREATE TABLE IF NOT EXISTS ai_advisor_auth (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_type TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        address TEXT NOT NULL,
        address_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(actor_type, actor_id, address)
    )`);
    await d1Run(db, `CREATE INDEX IF NOT EXISTS idx_ai_advisor_auth_actor ON ai_advisor_auth(actor_type, actor_id)`);
    await d1Run(db, `CREATE TABLE IF NOT EXISTS ai_advisor_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_type TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    await d1Run(db, `CREATE INDEX IF NOT EXISTS idx_ai_advisor_messages_actor ON ai_advisor_messages(actor_type, actor_id, id)`);
    await d1Run(db, AI_ADVISOR_PROVIDERS_SQL);
    tablesReady = true;
};

export const actorFromAdmin = (c: Context<HonoCustomType>): AdvisorActor | null => {
    const admin = getAdminPayload(c);
    if (!admin) return null;
    if (admin.role === "sub" && admin.sub_admin_id) {
        return { type: "sub", id: String(admin.sub_admin_id) };
    }
    return { type: "main", id: "main" };
};

export const actorFromAddressJwt = (payload: JwtPayload): AdvisorActor => {
    return { type: "user", id: String(payload.address_id) };
};

const isAiBound = (env: Bindings): boolean => {
    return Boolean(env.AI && typeof env.AI.run === "function");
};

const normalizeAddress = (value: unknown): string => {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
};

const decodeHtmlEntities = (text: string): string => {
    return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (match, entity) => {
        const normalized = String(entity).toLowerCase();
        if (normalized.startsWith("#x")) {
            const value = Number.parseInt(normalized.slice(2), 16);
            return Number.isFinite(value) ? String.fromCodePoint(value) : match;
        }
        if (normalized.startsWith("#")) {
            const value = Number.parseInt(normalized.slice(1), 10);
            return Number.isFinite(value) ? String.fromCodePoint(value) : match;
        }
        const named: Record<string, string> = {
            amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
        };
        return named[normalized] ?? match;
    });
};

const htmlToText = (html: string): string => {
    return decodeHtmlEntities(
        html
            .replace(/<\s*(script|style|head|svg)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, " ")
            .replace(/<[^>]+>/g, " ")
    )
        .replace(/\s+/g, " ")
        .trim();
};

const snippetFromParsed = (
    parsed: Awaited<ReturnType<typeof commonParseMail>>
): { subject: string; text: string } => {
    const subject = (parsed?.subject || "").trim();
    const text = (parsed?.text || htmlToText(parsed?.html || "")).trim();
    return {
        subject: subject.slice(0, 180),
        text: text.slice(0, MAX_SNIPPET),
    };
};

const loadSelectedAddresses = async (
    db: D1Database,
    actor: AdvisorActor
): Promise<string[]> => {
    const { results } = await db.prepare(
        `SELECT address FROM ai_advisor_auth WHERE actor_type = ? AND actor_id = ? ORDER BY id`
    ).bind(actor.type, actor.id).all<{ address: string }>();
    return (results || []).map((row) => row.address).filter(Boolean);
};

const replaceSelectedAddresses = async (
    db: D1Database,
    actor: AdvisorActor,
    rows: { address: string; address_id: number | null }[]
): Promise<void> => {
    await db.prepare(
        `DELETE FROM ai_advisor_auth WHERE actor_type = ? AND actor_id = ?`
    ).bind(actor.type, actor.id).run();
    if (rows.length === 0) return;
    await db.batch(rows.map((row) => db.prepare(
        `INSERT INTO ai_advisor_auth (actor_type, actor_id, address, address_id) VALUES (?, ?, ?, ?)`
    ).bind(actor.type, actor.id, row.address, row.address_id)));
};

const listAllowedMailboxRows = async (
    c: Context<HonoCustomType>,
    actor: AdvisorActor
): Promise<{
    id: number;
    name: string;
    owner_admin_id: number | null;
    owner_admin_type: string | null;
    owner_username: string;
    mail_count: number;
}[]> => {
    const mainUsername = getMainAdminUsername(c);
    const ownerSelect = `, CASE WHEN a.owner_admin_type = 'sub' THEN sa.username ELSE ? END AS owner_username`;
    const ownerJoin = ` LEFT JOIN sub_admins sa ON a.owner_admin_type = 'sub' AND a.owner_admin_id = sa.id`;
    const filters = [`${ADDRESS_ACTIVE_SQL.replace(/expires_at/g, "a.expires_at")}`];
    const params: (string | number)[] = [mainUsername];
    if (actor.type === "sub") {
        filters.push(`a.owner_admin_id = ? AND a.owner_admin_type = 'sub'`);
        params.push(Number(actor.id));
    }
    const whereSql = ` WHERE ${filters.join(" AND ")}`;
    const { results } = await c.env.DB.prepare(
        `SELECT a.id, a.name, a.owner_admin_id, a.owner_admin_type${ownerSelect},`
        + ` (SELECT COUNT(*) FROM raw_mails WHERE address = a.name) AS mail_count`
        + ` FROM address a${ownerJoin}${whereSql}`
        + ` ORDER BY CASE WHEN a.owner_admin_type = 'sub' THEN 1 ELSE 0 END, owner_username, a.name`
        + ` LIMIT 2000`
    ).bind(...params).all<{
        id: number;
        name: string;
        owner_admin_id: number | null;
        owner_admin_type: string | null;
        owner_username: string;
        mail_count: number;
    }>();
    return results || [];
};

const filterAddressesForActor = async (
    c: Context<HonoCustomType>,
    actor: AdvisorActor,
    addresses: string[]
): Promise<{ address: string; address_id: number | null }[]> => {
    const unique = [...new Set(addresses.map(normalizeAddress).filter(Boolean))];
    if (unique.length === 0) return [];
    if (unique.length > MAX_ADDRESSES) unique.length = MAX_ADDRESSES;
    const placeholders = unique.map(() => "?").join(",");
    const params: (string | number)[] = [...unique];
    let ownerSql = "";
    if (actor.type === "sub") {
        ownerSql = ` AND owner_admin_id = ? AND owner_admin_type = 'sub'`;
        params.push(Number(actor.id));
    }
    const { results } = await c.env.DB.prepare(
        `SELECT id, name FROM address WHERE name IN (${placeholders}) AND ${ADDRESS_ACTIVE_SQL}${ownerSql}`
    ).bind(...params).all<{ id: number; name: string }>();
    const found = new Map((results || []).map((row) => [row.name, row.id]));
    return unique
        .filter((name) => found.has(name))
        .map((name) => ({ address: name, address_id: found.get(name) ?? null }));
};

const verifyAddressJwt = async (
    c: Context<HonoCustomType>,
    token: unknown
): Promise<{ address: string; address_id: number } | null> => {
    if (typeof token !== "string" || !token.trim()) return null;
    try {
        const payload = await Jwt.verify(token.trim(), c.env.JWT_SECRET, "HS256") as JwtPayload;
        if (!payload?.address || !payload?.address_id) return null;
        const row = await c.env.DB.prepare(
            `SELECT id, name FROM address WHERE id = ? AND name = ? AND ${ADDRESS_ACTIVE_SQL}`
        ).bind(payload.address_id, payload.address).first<{ id: number; name: string }>();
        if (!row) return null;
        return { address: row.name, address_id: row.id };
    } catch {
        return null;
    }
};

const loadMailDigest = async (
    db: D1Database,
    addresses: string[]
): Promise<{ count: number; digest: string }> => {
    if (addresses.length === 0) return { count: 0, digest: "" };
    const placeholders = addresses.map(() => "?").join(",");
    const { results } = await db.prepare(
        `SELECT id, address, source, raw, raw_blob, metadata, created_at`
        + ` FROM raw_mails WHERE address IN (${placeholders})`
        + ` ORDER BY created_at DESC LIMIT ?`
    ).bind(...addresses, MAX_MAILS).all<RawMailRow>();
    const parts: string[] = [];
    for (const row of results || []) {
        const resolved = await resolveRawEmailRow(row);
        const parsed = resolved.raw
            ? await commonParseMail({ rawEmail: resolved.raw })
            : undefined;
        const snippet = snippetFromParsed(parsed);
        let extractHint = "";
        try {
            if (typeof row.metadata === "string" && row.metadata) {
                const meta = JSON.parse(row.metadata);
                const extract = meta?.ai_extract;
                if (extract?.type && extract?.result && extract.type !== "none") {
                    extractHint = `提取(${extract.type}): ${String(extract.result).slice(0, 120)}`;
                }
            }
        } catch {
            extractHint = "";
        }
        parts.push([
            `邮箱: ${row.address || ""}`,
            `时间: ${row.created_at || ""}`,
            `发件人: ${parsed?.sender || row.source || ""}`,
            `主题: ${snippet.subject || "(无主题)"}`,
            extractHint,
            `正文: ${snippet.text || "(无正文)"}`,
        ].filter(Boolean).join("\n"));
    }
    return {
        count: parts.length,
        digest: parts.map((part, index) => `[邮件${index + 1}]\n${part}`).join("\n\n"),
    };
};

const loadHistory = async (
    db: D1Database,
    actor: AdvisorActor
): Promise<{ role: "user" | "assistant"; content: string }[]> => {
    const { results } = await db.prepare(
        `SELECT role, content FROM ai_advisor_messages`
        + ` WHERE actor_type = ? AND actor_id = ?`
        + ` ORDER BY id DESC LIMIT ?`
    ).bind(actor.type, actor.id, MAX_HISTORY).all<{ role: string; content: string }>();
    return (results || [])
        .reverse()
        .filter((row) => row.role === "user" || row.role === "assistant")
        .map((row) => ({
            role: row.role as "user" | "assistant",
            content: row.content,
        }));
};

const saveMessage = async (
    db: D1Database,
    actor: AdvisorActor,
    role: "user" | "assistant",
    content: string
): Promise<void> => {
    await db.prepare(
        `INSERT INTO ai_advisor_messages (actor_type, actor_id, role, content) VALUES (?, ?, ?, ?)`
    ).bind(actor.type, actor.id, role, content).run();
    const cutoff = await db.prepare(
        `SELECT id FROM ai_advisor_messages WHERE actor_type = ? AND actor_id = ?`
        + ` ORDER BY id DESC LIMIT 1 OFFSET ?`
    ).bind(actor.type, actor.id, MAX_STORED_MESSAGES).first<number>("id");
    if (cutoff) {
        await db.prepare(
            `DELETE FROM ai_advisor_messages WHERE actor_type = ? AND actor_id = ? AND id <= ?`
        ).bind(actor.type, actor.id, cutoff).run();
    }
};

export const listAdvisorMailboxes = async (
    c: Context<HonoCustomType>,
    actor: AdvisorActor
): Promise<Response> => {
    await ensureAiAdvisorTables(c.env.DB);
    const rows = await listAllowedMailboxRows(c, actor);
    const selected = await loadSelectedAddresses(c.env.DB, actor);
    const groups = new Map<string, {
        key: string;
        label: string;
        owner_type: string;
        owner_id: number | null;
        addresses: { id: number; name: string; mail_count: number }[];
    }>();
    if (actor.type === "main") {
        groups.set("main", {
            key: "main",
            label: getMainAdminUsername(c),
            owner_type: "main",
            owner_id: null,
            addresses: [],
        });
        const { results: subs } = await c.env.DB.prepare(
            `SELECT id, username FROM sub_admins ORDER BY id`
        ).all<{ id: number; username: string }>();
        for (const sub of subs || []) {
            groups.set(`sub:${sub.id}`, {
                key: `sub:${sub.id}`,
                label: sub.username,
                owner_type: "sub",
                owner_id: sub.id,
                addresses: [],
            });
        }
    }
    for (const row of rows) {
        const isSub = row.owner_admin_type === "sub" && row.owner_admin_id;
        const key = actor.type === "sub"
            ? `sub:${actor.id}`
            : (isSub ? `sub:${row.owner_admin_id}` : "main");
        if (!groups.has(key)) {
            groups.set(key, {
                key,
                label: row.owner_username || key,
                owner_type: isSub ? "sub" : "main",
                owner_id: isSub ? Number(row.owner_admin_id) : null,
                addresses: [],
            });
        }
        groups.get(key)?.addresses.push({
            id: row.id,
            name: row.name,
            mail_count: Number(row.mail_count) || 0,
        });
    }
    return c.json({
        aiBound: isAiBound(c.env),
        selected,
        groups: [...groups.values()],
    });
};

export const getAdvisorAuth = async (
    c: Context<HonoCustomType>,
    actor: AdvisorActor
): Promise<Response> => {
    await ensureAiAdvisorTables(c.env.DB);
    const selected = await loadSelectedAddresses(c.env.DB, actor);
    return c.json({ aiBound: isAiBound(c.env), selected });
};

export const saveAdvisorAuth = async (
    c: Context<HonoCustomType>,
    actor: AdvisorActor
): Promise<Response> => {
    const msgs = i18n.getMessagesbyContext(c);
    await ensureAiAdvisorTables(c.env.DB);
    const body = await c.req.json().catch(() => ({})) as { addresses?: unknown };
    const requested = Array.isArray(body.addresses)
        ? body.addresses.map(normalizeAddress).filter(Boolean)
        : [];
    if (requested.length > MAX_ADDRESSES) {
        return c.text(msgs.AiAdvisorTooManyMailboxMsg, 400);
    }
    const allowed = await filterAddressesForActor(c, actor, requested);
    await replaceSelectedAddresses(c.env.DB, actor, allowed);
    return c.json({ success: true, selected: allowed.map((row) => row.address) });
};

export const saveUserAdvisorAuth = async (
    c: Context<HonoCustomType>,
    actor: AdvisorActor,
    current: JwtPayload
): Promise<Response> => {
    const msgs = i18n.getMessagesbyContext(c);
    await ensureAiAdvisorTables(c.env.DB);
    const body = await c.req.json().catch(() => ({})) as {
        addresses?: unknown;
        credentials?: unknown;
    };
    const owned = new Map<string, number>();
    owned.set(normalizeAddress(current.address), current.address_id);
    const credentials = Array.isArray(body.credentials) ? body.credentials : [];
    for (const token of credentials) {
        const verified = await verifyAddressJwt(c, token);
        if (verified) owned.set(normalizeAddress(verified.address), verified.address_id);
    }
    const requested = Array.isArray(body.addresses)
        ? body.addresses.map(normalizeAddress).filter(Boolean)
        : [...owned.keys()];
    if (requested.length > MAX_ADDRESSES) {
        return c.text(msgs.AiAdvisorTooManyMailboxMsg, 400);
    }
    const allowed = requested
        .filter((name) => owned.has(name))
        .map((name) => ({ address: name, address_id: owned.get(name) ?? null }));
    const { results: previous } = await c.env.DB.prepare(
        `SELECT address_id FROM ai_advisor_auth WHERE actor_type = ? AND actor_id = ?`
    ).bind(actor.type, actor.id).all<{ address_id: number | null }>();
    const actorIds = new Set<string>([actor.id]);
    for (const row of previous || []) {
        if (row.address_id) actorIds.add(String(row.address_id));
    }
    for (const row of allowed) {
        if (row.address_id) actorIds.add(String(row.address_id));
    }
    for (const actorId of actorIds) {
        await replaceSelectedAddresses(c.env.DB, { type: "user", id: actorId }, allowed);
    }
    return c.json({ success: true, selected: allowed.map((row) => row.address) });
};

export const listAdvisorMessages = async (
    c: Context<HonoCustomType>,
    actor: AdvisorActor
): Promise<Response> => {
    await ensureAiAdvisorTables(c.env.DB);
    const history = await loadHistory(c.env.DB, actor);
    return c.json({ aiBound: isAiBound(c.env), results: history });
};

export const clearAdvisorMessages = async (
    c: Context<HonoCustomType>,
    actor: AdvisorActor
): Promise<Response> => {
    await ensureAiAdvisorTables(c.env.DB);
    await c.env.DB.prepare(
        `DELETE FROM ai_advisor_messages WHERE actor_type = ? AND actor_id = ?`
    ).bind(actor.type, actor.id).run();
    return c.json({ success: true });
};

export const chatAdvisor = async (
    c: Context<HonoCustomType>,
    actor: AdvisorActor
): Promise<Response> => {
    const msgs = i18n.getMessagesbyContext(c);
    await ensureAiAdvisorTables(c.env.DB);
    const body = await c.req.json().catch(() => ({})) as {
        message?: unknown;
        provider?: unknown;
        model?: unknown;
    };
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message || message.length > MAX_MESSAGE) {
        return c.text(msgs.AiAdvisorMessageRequiredMsg, 400);
    }
    const target = await resolveCompletionTarget(c, actor, body);
    if (!target.ok) {
        return c.body(target.error, target.status);
    }
    const selected = await loadSelectedAddresses(c.env.DB, actor);
    const allowed = await filterAddressesForActor(c, actor, selected);
    const addresses = allowed.map((row) => row.address);
    if (addresses.length === 0) {
        return c.text(msgs.AiAdvisorNoMailboxMsg, 400);
    }
    const digest = await loadMailDigest(c.env.DB, addresses);
    const history = await loadHistory(c.env.DB, actor);
    const system = [
        "你是企业邮箱管理平台中的邮件顾问。只能根据用户已授权邮箱里、下面提供的最近邮件摘要来回答。",
        "规则：不要编造邮件、验证码或链接；摘要里没有的信息就明确说没看到；不要协助盗号、钓鱼或绕过他人账户；用用户提问的语言回答。",
        `已授权邮箱: ${addresses.join(", ")}`,
        digest.count > 0
            ? `最近 ${digest.count} 封邮件摘要:\n${digest.digest}`
            : "这些邮箱目前没有邮件。",
    ].join("\n\n");
    const aiMessages = [
        { role: "system", content: system },
        ...history.map((row) => ({ role: row.role, content: row.content })),
        { role: "user", content: message },
    ];
    await saveMessage(c.env.DB, actor, "user", message);
    try {
        const result = await executeCompletion(c.env, target.target, aiMessages);
        if (!result.ok) {
            const status = result.status === 401 || result.status === 403 ? 400 : (result.status || 502);
            return c.body(result.error || msgs.AiAdvisorFailedMsg, status);
        }
        const text = result.output || msgs.AiAdvisorFailedMsg;
        await saveMessage(c.env.DB, actor, "assistant", text);
        return c.json({
            reply: text,
            mail_count: digest.count,
            addresses,
            provider: target.target.provider,
            model: target.target.model,
        });
    } catch (error) {
        console.error("AI advisor chat error:", error);
        return c.text(msgs.AiAdvisorFailedMsg, 500);
    }
};
