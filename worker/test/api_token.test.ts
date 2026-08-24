import assert from "node:assert/strict";
import { test } from "node:test";

import { buildTokenCreatePayload } from "../src/api_token_scopes.ts";
import { generateApiToken, hashApiToken } from "../src/api_token_crypto.ts";

test("generated token hashes stably and only shows the prefix later", async () => {
    const first = await generateApiToken();
    assert.equal(first.token.startsWith("em_"), true);
    assert.equal(first.prefix.startsWith("em_"), true);
    assert.equal(first.token.includes(first.prefix), true);
    assert.equal(first.hash, await hashApiToken(first.token));
    assert.notEqual(first.hash, first.token);
});

test("create payload defaults to every scope the role may grant", () => {
    const payload = buildTokenCreatePayload("user", "  inbox reader  ", []);
    assert.equal(payload.name, "inbox reader");
    assert.equal(payload.scopes.includes("mail.inbox.read"), true);
    assert.equal(payload.scopes.includes("address.create.write"), false);
});

test("create payload rejects a blank name", () => {
    assert.throws(() => buildTokenCreatePayload("main", "   ", ["mail.inbox.read"]), /RequiredField/);
});

test("create payload drops scopes the role cannot grant", () => {
    const payload = buildTokenCreatePayload("sub", "limited", ["sub_admin.quota.write", "mail.inbox.read"]);
    assert.deepEqual(payload.scopes, ["mail.inbox.read"]);
});
