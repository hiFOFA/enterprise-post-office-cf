import assert from "node:assert/strict";
import { test } from "node:test";

import { decryptSecret, encryptSecret, maskApiKey } from "../src/ai_advisor_crypto.ts";
import {
    assertPublicHttpsUrl,
    claudeMessagesUrl,
    openaiChatCompletionsUrl,
} from "../src/ai_advisor_http.ts";
import {
    DEFAULT_CF_MODEL,
    PAID_CF_MODELS,
    isFreeCfTextModel,
    listFreeCfModelIds,
    pickDefaultCfModel,
} from "../src/ai_advisor_models.ts";
import {
    defaultCfModelForActor,
    isCfModelAllowed,
    parseAdvisorPolicy,
    resolveAllowedCfModels,
    resolveRoleCfAccess,
} from "../src/ai_advisor_policy.ts";

test("free catalog excludes paid frontier models and keeps the default 8B fast", () => {
    const ids = listFreeCfModelIds();
    assert.equal(ids.includes(DEFAULT_CF_MODEL), true);
    for (const paid of PAID_CF_MODELS) {
        assert.equal(ids.includes(paid), false);
        assert.equal(isFreeCfTextModel(paid), false);
    }
});

test("default CF model falls back to the first allowed id", () => {
    assert.equal(pickDefaultCfModel([DEFAULT_CF_MODEL, "@cf/openai/gpt-oss-20b"]), DEFAULT_CF_MODEL);
    assert.equal(pickDefaultCfModel(["@cf/zai-org/glm-4.7-flash"]), "@cf/zai-org/glm-4.7-flash");
});

test("sub-admin without override inherits the default policy", () => {
    const policy = parseAdvisorPolicy({
        user: { enableCf: false, models: [DEFAULT_CF_MODEL] },
        subDefault: { enableCf: true, models: [DEFAULT_CF_MODEL] },
        subById: {
            "9": { enableCf: false, models: [] },
        },
    });
    const inherited = resolveRoleCfAccess({ type: "sub", id: "3" }, policy);
    assert.deepEqual(inherited, { enableCf: true, models: [DEFAULT_CF_MODEL], inherited: true });
    const override = resolveRoleCfAccess({ type: "sub", id: "9" }, policy);
    assert.equal(override.enableCf, false);
    assert.equal(override.inherited, false);
});

test("users share one policy and empty models means all free models", () => {
    const policy = parseAdvisorPolicy({
        user: { enableCf: true, models: [] },
    });
    const allowed = resolveAllowedCfModels({ type: "user", id: "7" }, policy);
    assert.deepEqual(allowed, listFreeCfModelIds());
});

test("main admin always has CF and paid models stay blocked", () => {
    const policy = parseAdvisorPolicy({
        user: { enableCf: false, models: [] },
        subDefault: { enableCf: false, models: [] },
    });
    assert.equal(isCfModelAllowed({ type: "main", id: "main" }, policy, DEFAULT_CF_MODEL), true);
    assert.equal(isCfModelAllowed({ type: "user", id: "1" }, policy, DEFAULT_CF_MODEL), false);
    assert.equal(
        isCfModelAllowed({ type: "main", id: "main" }, policy, "@cf/moonshotai/kimi-k2.6"),
        false
    );
    assert.equal(defaultCfModelForActor({ type: "main", id: "main" }, policy), DEFAULT_CF_MODEL);
});

test("custom API URLs must be public https", () => {
    assert.equal(openaiChatCompletionsUrl("https://api.openai.com/v1").endsWith("/chat/completions"), true);
    assert.equal(claudeMessagesUrl("https://api.anthropic.com"), "https://api.anthropic.com/v1/messages");
    assert.throws(() => assertPublicHttpsUrl("http://api.openai.com/v1"));
    assert.throws(() => assertPublicHttpsUrl("https://127.0.0.1/v1"));
    assert.throws(() => assertPublicHttpsUrl("https://10.0.0.4/v1"));
    assert.throws(() => assertPublicHttpsUrl("https://169.254.169.254/latest"));
});

test("api keys are masked and round-trip through encryption", async () => {
    assert.equal(maskApiKey("sk-1234567890abcd"), "************abcd");
    const secret = "jwt-secret-for-test";
    const cipher = await encryptSecret(secret, "sk-live-secret");
    assert.equal(cipher.includes("sk-live-secret"), false);
    assert.equal(await decryptSecret(secret, cipher), "sk-live-secret");
});
