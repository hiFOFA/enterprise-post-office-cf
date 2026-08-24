import { Context } from "hono";

import { CONSTANTS } from "./constants";
import { decryptSecret, encryptSecret, maskApiKey } from "./ai_advisor_crypto";
import {
    claudeMessagesUrl,
    defaultBaseUrl,
    openaiChatCompletionsUrl,
    runClaudeCompatible,
    runOpenAiCompatible,
    runWorkersAi,
    type AdvisorProviderKind,
    type ProviderRunResult,
} from "./ai_advisor_http";
import { listFreeCfTextModels } from "./ai_advisor_models";
import {
    defaultCfModelForActor,
    isCfModelAllowed,
    parseAdvisorPolicy,
    parseRoleCfAccess,
    resolveAllowedCfModels,
    resolveRoleCfAccess,
    type AdvisorActorRef,
    type AdvisorPolicy,
} from "./ai_advisor_policy";
import i18n from "./i18n";
import { getJsonSetting, saveSetting } from "./utils";

export const AI_ADVISOR_PROVIDERS_SQL = `CREATE TABLE IF NOT EXISTS ai_advisor_providers (
    actor_type TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'cf',
    cf_model TEXT,
    base_url TEXT,
    model_id TEXT,
    api_key_enc TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (actor_type, actor_id)
);`;

type ProviderRow = {
    provider: string;
    cf_model: string | null;
    base_url: string | null;
    model_id: string | null;
    api_key_enc: string | null;
};

export type CompletionTarget = {
    provider: AdvisorProviderKind;
    model: string;
    baseUrl?: string;
    apiKey?: string;
};

const asProviderKind = (value: unknown): AdvisorProviderKind | null => {
    if (value === "cf" || value === "openai" || value === "claude") return value;
    return null;
};

export const loadAdvisorPolicy = async (c: Context<HonoCustomType>): Promise<AdvisorPolicy> => {
    const raw = await getJsonSetting(c, CONSTANTS.AI_ADVISOR_POLICY_KEY);
    return parseAdvisorPolicy(raw);
};

const loadProviderRow = async (
    db: D1Database,
    actor: AdvisorActorRef
): Promise<ProviderRow | null> => {
    return await db.prepare(
        `SELECT provider, cf_model, base_url, model_id, api_key_enc`
        + ` FROM ai_advisor_providers WHERE actor_type = ? AND actor_id = ?`
    ).bind(actor.type, actor.id).first<ProviderRow>();
};

const decryptStoredKey = async (
    secret: string,
    enc: string | null | undefined
): Promise<string> => {
    if (!enc) return "";
    try {
        return await decryptSecret(secret, enc);
    } catch {
        return "";
    }
};

export const getAdvisorModels = async (
    c: Context<HonoCustomType>,
    actor: AdvisorActorRef
): Promise<Response> => {
    const policy = await loadAdvisorPolicy(c);
    const access = resolveRoleCfAccess(actor, policy);
    const allowedIds = resolveAllowedCfModels(actor, policy);
    const catalog = listFreeCfTextModels();
    const row = await loadProviderRow(c.env.DB, actor);
    const cfAllowed = access.enableCf;
    const storedKind = asProviderKind(row?.provider) || "cf";
    const provider = storedKind === "cf" && !cfAllowed ? "openai" : storedKind;
    let apiKeyMasked = "";
    if (row?.api_key_enc) {
        const plain = await decryptStoredKey(c.env.JWT_SECRET, row.api_key_enc);
        apiKeyMasked = maskApiKey(plain || "****");
    }
    return c.json({
        aiBound: Boolean(c.env.AI && typeof c.env.AI.run === "function"),
        cfAllowed,
        inherited: access.inherited,
        models: catalog.filter((model) => allowedIds.includes(model.id)),
        catalog: actor.type === "main" ? catalog : catalog.filter((model) => allowedIds.includes(model.id)),
        provider: {
            provider,
            cfModel: row?.cf_model && allowedIds.includes(row.cf_model)
                ? row.cf_model
                : defaultCfModelForActor(actor, policy),
            baseUrl: row?.base_url || defaultBaseUrl(provider === "cf" ? "openai" : provider),
            modelId: row?.model_id || "",
            apiKeyMasked,
            hasKey: Boolean(row?.api_key_enc),
            cfAllowed,
        },
    });
};

export const saveAdvisorProvider = async (
    c: Context<HonoCustomType>,
    actor: AdvisorActorRef
): Promise<Response> => {
    const msgs = i18n.getMessagesbyContext(c);
    const policy = await loadAdvisorPolicy(c);
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const provider = asProviderKind(body.provider);
    if (!provider) return c.text(msgs.AiAdvisorInvalidProviderMsg, 400);
    if (provider === "cf" && !resolveRoleCfAccess(actor, policy).enableCf) {
        return c.text(msgs.AiAdvisorCfDisabledMsg, 403);
    }
    const existing = await loadProviderRow(c.env.DB, actor);
    const cfModel = typeof body.cfModel === "string" ? body.cfModel.trim() : (existing?.cf_model || "");
    if (provider === "cf" && cfModel && !isCfModelAllowed(actor, policy, cfModel)) {
        return c.text(msgs.AiAdvisorCfDisabledMsg, 403);
    }
    let baseUrl = typeof body.baseUrl === "string" ? body.baseUrl.trim() : (existing?.base_url || defaultBaseUrl(provider));
    const modelId = typeof body.modelId === "string" ? body.modelId.trim() : (existing?.model_id || "");
    if (provider !== "cf") {
        if (!baseUrl) baseUrl = defaultBaseUrl(provider);
        try {
            if (provider === "openai") openaiChatCompletionsUrl(baseUrl);
            else claudeMessagesUrl(baseUrl);
        } catch {
            return c.text(msgs.AiAdvisorInvalidUrlMsg, 400);
        }
    }
    let apiKeyEnc = existing?.api_key_enc || "";
    if (typeof body.apiKey === "string" && body.apiKey.trim()) {
        if (!c.env.JWT_SECRET) return c.text(msgs.JWTSecretNotSetMsg, 500);
        apiKeyEnc = await encryptSecret(c.env.JWT_SECRET, body.apiKey.trim());
    }
    await c.env.DB.prepare(
        `INSERT INTO ai_advisor_providers`
        + ` (actor_type, actor_id, provider, cf_model, base_url, model_id, api_key_enc, updated_at)`
        + ` VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        + ` ON CONFLICT(actor_type, actor_id) DO UPDATE SET`
        + ` provider = excluded.provider, cf_model = excluded.cf_model, base_url = excluded.base_url,`
        + ` model_id = excluded.model_id, api_key_enc = excluded.api_key_enc, updated_at = datetime('now')`
    ).bind(
        actor.type,
        actor.id,
        provider,
        cfModel || defaultCfModelForActor(actor, policy),
        baseUrl,
        modelId,
        apiKeyEnc
    ).run();
    return getAdvisorModels(c, actor);
};

export const testAdvisorProvider = async (
    c: Context<HonoCustomType>,
    actor: AdvisorActorRef
): Promise<Response> => {
    const msgs = i18n.getMessagesbyContext(c);
    const policy = await loadAdvisorPolicy(c);
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const provider = asProviderKind(body.provider) || "cf";
    const existing = await loadProviderRow(c.env.DB, actor);
    const hi = [{ role: "user", content: "hi" }];
    if (provider === "cf") {
        const model = typeof body.model === "string" && body.model.trim()
            ? body.model.trim()
            : defaultCfModelForActor(actor, policy);
        if (!resolveRoleCfAccess(actor, policy).enableCf || !isCfModelAllowed(actor, policy, model)) {
            return c.json({
                ok: false,
                status: 403,
                output: "",
                error: msgs.AiAdvisorCfDisabledMsg,
                first_token_ms: null,
                total_ms: 0,
            });
        }
        return c.json(await runWorkersAi(c.env, model, hi));
    }
    const baseUrl = typeof body.baseUrl === "string" && body.baseUrl.trim()
        ? body.baseUrl.trim()
        : (existing?.base_url || defaultBaseUrl(provider));
    const modelId = typeof body.modelId === "string" && body.modelId.trim()
        ? body.modelId.trim()
        : (existing?.model_id || "");
    const typedKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    const apiKey = typedKey || await decryptStoredKey(c.env.JWT_SECRET, existing?.api_key_enc);
    if (!modelId) {
        return c.json({
            ok: false, status: 400, output: "", error: msgs.AiAdvisorNeedModelIdMsg,
            first_token_ms: null, total_ms: 0,
        });
    }
    if (!apiKey) {
        return c.json({
            ok: false, status: 400, output: "", error: msgs.AiAdvisorNeedApiKeyMsg,
            first_token_ms: null, total_ms: 0,
        });
    }
    const result = provider === "claude"
        ? await runClaudeCompatible({ baseUrl, model: modelId, apiKey, messages: hi })
        : await runOpenAiCompatible({ baseUrl, model: modelId, apiKey, messages: hi });
    return c.json(result);
};

export const getAdvisorPolicy = async (c: Context<HonoCustomType>): Promise<Response> => {
    const policy = await loadAdvisorPolicy(c);
    const { results } = await c.env.DB.prepare(
        `SELECT id, username FROM sub_admins ORDER BY id`
    ).all<{ id: number; username: string }>();
    return c.json({
        catalog: listFreeCfTextModels(),
        user: policy.user,
        subDefault: policy.subDefault,
        subById: policy.subById,
        subAdmins: (results || []).map((row) => ({
            id: row.id,
            username: row.username,
            inherited: !policy.subById[String(row.id)],
        })),
    });
};

export const saveAdvisorPolicy = async (c: Context<HonoCustomType>): Promise<Response> => {
    const msgs = i18n.getMessagesbyContext(c);
    const admin = c.get("adminPayload");
    if (admin?.role === "sub") {
        return c.text(msgs.ForbiddenForSubAdminMsg, 403);
    }
    const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
    const current = await loadAdvisorPolicy(c);
    const next: AdvisorPolicy = {
        user: body.user === undefined ? current.user : parseRoleCfAccess(body.user),
        subDefault: body.subDefault === undefined ? current.subDefault : parseRoleCfAccess(body.subDefault),
        subById: { ...current.subById },
    };
    if (body.subById && typeof body.subById === "object") {
        next.subById = {};
        for (const [id, access] of Object.entries(body.subById as Record<string, unknown>)) {
            next.subById[String(id)] = parseRoleCfAccess(access);
        }
    }
    if (typeof body.clearSubId === "string" && body.clearSubId) {
        delete next.subById[body.clearSubId];
    }
    if (body.subId != null && body.subAccess) {
        const subId = String(body.subId);
        if (subId === "default" || subId === "") {
            next.subDefault = parseRoleCfAccess(body.subAccess);
        } else if (body.inherit === true) {
            delete next.subById[subId];
        } else {
            next.subById[subId] = parseRoleCfAccess(body.subAccess);
        }
    }
    await saveSetting(c, CONSTANTS.AI_ADVISOR_POLICY_KEY, JSON.stringify(next));
    return getAdvisorPolicy(c);
};

export const resolveCompletionTarget = async (
    c: Context<HonoCustomType>,
    actor: AdvisorActorRef,
    body: { provider?: unknown; model?: unknown }
): Promise<{ ok: true; target: CompletionTarget } | { ok: false; status: number; error: string }> => {
    const msgs = i18n.getMessagesbyContext(c);
    const policy = await loadAdvisorPolicy(c);
    const existing = await loadProviderRow(c.env.DB, actor);
    const requested = asProviderKind(body.provider) || asProviderKind(existing?.provider) || "cf";
    if (requested === "cf") {
        if (!resolveRoleCfAccess(actor, policy).enableCf) {
            return { ok: false, status: 403, error: msgs.AiAdvisorCfDisabledMsg };
        }
        const model = typeof body.model === "string" && body.model.trim()
            ? body.model.trim()
            : (existing?.cf_model || defaultCfModelForActor(actor, policy));
        if (!isCfModelAllowed(actor, policy, model)) {
            return { ok: false, status: 403, error: msgs.AiAdvisorCfDisabledMsg };
        }
        if (!c.env.AI || typeof c.env.AI.run !== "function") {
            return { ok: false, status: 503, error: msgs.AiAdvisorNotBoundMsg };
        }
        return { ok: true, target: { provider: "cf", model } };
    }
    const baseUrl = existing?.base_url || defaultBaseUrl(requested);
    const model = typeof body.model === "string" && body.model.trim()
        ? body.model.trim()
        : (existing?.model_id || "");
    const apiKey = await decryptStoredKey(c.env.JWT_SECRET, existing?.api_key_enc);
    if (!model) return { ok: false, status: 400, error: msgs.AiAdvisorNeedCustomMsg };
    if (!apiKey) return { ok: false, status: 400, error: msgs.AiAdvisorNeedCustomMsg };
    if (!baseUrl) return { ok: false, status: 400, error: msgs.AiAdvisorInvalidUrlMsg };
    return { ok: true, target: { provider: requested, model, baseUrl, apiKey } };
};

export const executeCompletion = async (
    env: Bindings,
    target: CompletionTarget,
    messages: { role: string; content: string }[]
): Promise<ProviderRunResult> => {
    if (target.provider === "cf") {
        return runWorkersAi(env, target.model, messages);
    }
    if (target.provider === "claude") {
        return runClaudeCompatible({
            baseUrl: target.baseUrl || defaultBaseUrl("claude"),
            model: target.model,
            apiKey: target.apiKey || "",
            messages,
            stream: false,
        });
    }
    return runOpenAiCompatible({
        baseUrl: target.baseUrl || defaultBaseUrl("openai"),
        model: target.model,
        apiKey: target.apiKey || "",
        messages,
        stream: false,
    });
};
