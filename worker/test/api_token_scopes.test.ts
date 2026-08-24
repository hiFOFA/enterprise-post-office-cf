import assert from "node:assert/strict";
import { test } from "node:test";

import {
    authorizeApiTokenRequest,
    catalogForRole,
    expandGrantedScopes,
    extractApiToken,
    scopeForRequest,
    scopesForRole,
} from "../src/api_token_scopes.ts";

test("inbox read is one scope for every mailbox-read path", () => {
    const paths = [
        ["GET", "/api/mails"],
        ["GET", "/api/mail/12"],
        ["GET", "/api/parsed_mails"],
        ["GET", "/api/parsed_mail/12"],
        ["GET", "/admin/mails"],
        ["GET", "/admin/mails/12"],
    ];
    for (const [method, path] of paths) {
        assert.equal(scopeForRequest(method, path), "mail.inbox.read", `${method} ${path}`);
    }
});

test("unknown mail stays its own main-only scopes", () => {
    assert.equal(scopeForRequest("GET", "/admin/mails_unknow"), "mail.unknown.read");
    assert.equal(scopeForRequest("DELETE", "/admin/mails/9"), "mail.inbox.write");
    assert.equal(scopesForRole("main").some((item) => item.id === "mail.unknown.write"), false);
    assert.equal(scopesForRole("main").some((item) => item.id === "send.status.read"), false);
});

test("each role only sees scopes it can actually use", () => {
    const main = new Set(scopesForRole("main").map((item) => item.id));
    const sub = new Set(scopesForRole("sub").map((item) => item.id));
    const user = new Set(scopesForRole("user").map((item) => item.id));

    assert.equal(main.has("mail.inbox.read"), true);
    assert.equal(main.has("sub_admin.quota.write"), true);
    assert.equal(main.has("address.create.write"), true);

    assert.equal(sub.has("mail.inbox.read"), true);
    assert.equal(sub.has("address.create.write"), true);
    assert.equal(sub.has("sub_admin.quota.write"), false);
    assert.equal(sub.has("mail.unknown.read"), false);

    assert.equal(user.has("mail.inbox.read"), true);
    assert.equal(user.has("address.create.write"), false);
    assert.equal(user.has("sub_admin.quota.write"), false);
    assert.equal(user.has("self_service.read"), true);
});

test("empty grant means the whole catalog for that role", () => {
    const allUser = scopesForRole("user").map((item) => item.id).sort();
    assert.deepEqual(expandGrantedScopes("user", []).sort(), allUser);
});

test("selecting a category read/write expands only those items for the role", () => {
    const granted = expandGrantedScopes("sub", ["mail.read", "mail.write"]);
    assert.equal(granted.includes("mail.inbox.read"), true);
    assert.equal(granted.includes("mail.inbox.write"), true);
    assert.equal(granted.includes("mail.sendbox.read"), true);
    assert.equal(granted.includes("mail.unknown.read"), false);
});

test("foreign scopes are dropped instead of stored", () => {
    const granted = expandGrantedScopes("user", ["address.create.write", "mail.inbox.read"]);
    assert.deepEqual(granted, ["mail.inbox.read"]);
});

test("catalog groups read and write under each category", () => {
    const catalog = catalogForRole("main");
    const mail = catalog.find((item) => item.id === "mail");
    assert.ok(mail);
    assert.equal(mail?.read.some((item) => item.id === "mail.inbox.read"), true);
    assert.equal(mail?.write.some((item) => item.id === "mail.inbox.write"), true);
    const quota = catalog.find((item) => item.id === "sub_admin");
    assert.equal(quota?.write.some((item) => item.id === "sub_admin.quota.write"), true);
});

test("extractApiToken only accepts Bearer em_ secrets", () => {
    assert.equal(extractApiToken(null), null);
    assert.equal(extractApiToken("Bearer jwt.not.an.api.token"), null);
    assert.equal(extractApiToken("em_nothex"), null);
    const token = `em_${"ab".repeat(24)}`;
    assert.equal(extractApiToken(`Bearer ${token}`), token);
    assert.equal(extractApiToken(token), token);
});

test("scoped tokens cannot manage tokens or hit unmapped leftover APIs", () => {
    const inbox = ["mail.inbox.read"];
    assert.equal(authorizeApiTokenRequest(inbox, "GET", "/api/api_tokens"), "forbidden");
    assert.equal(authorizeApiTokenRequest(inbox, "POST", "/admin/api_tokens"), "forbidden");
    assert.equal(authorizeApiTokenRequest(inbox, "GET", "/admin/ai_extract/settings"), "unmapped");
    assert.equal(authorizeApiTokenRequest(inbox, "GET", "/admin/users"), "unmapped");
    assert.equal(authorizeApiTokenRequest(inbox, "POST", "/external/api/send_mail"), "unmapped");
});

test("inbox-only token can read mail and mailbox identity, but cannot send", () => {
    const inbox = ["mail.inbox.read"];
    assert.equal(authorizeApiTokenRequest(inbox, "GET", "/api/mails"), "ok");
    assert.equal(authorizeApiTokenRequest(inbox, "GET", "/api/parsed_mail/3"), "ok");
    assert.equal(authorizeApiTokenRequest(inbox, "GET", "/api/settings"), "ok");
    assert.equal(authorizeApiTokenRequest(inbox, "POST", "/api/send_mail"), "forbidden");
    assert.equal(authorizeApiTokenRequest(inbox, "DELETE", "/api/mails/3"), "forbidden");
});

test("group and note paths have their own scopes for every role", () => {
    assert.equal(scopeForRequest("GET", "/admin/address_groups"), "address.group.read");
    assert.equal(scopeForRequest("GET", "/api/address_groups"), "address.group.read");
    assert.equal(scopeForRequest("GET", "/admin/address_groups/3/members"), "address.group.read");
    assert.equal(scopeForRequest("GET", "/api/address_notes"), "address.group.read");
    assert.equal(scopeForRequest("GET", "/admin/group_limits"), "address.group.read");
    assert.equal(scopeForRequest("POST", "/admin/address_groups"), "address.group.write");
    assert.equal(scopeForRequest("DELETE", "/api/address_groups/3"), "address.group.write");
    assert.equal(scopeForRequest("POST", "/admin/address_groups/3/members"), "address.group.write");
    assert.equal(scopeForRequest("POST", "/admin/group_limits"), "address.group.write");
    assert.equal(scopeForRequest("POST", "/admin/address/9/note"), "address.note.write");
    assert.equal(scopeForRequest("POST", "/api/address/9/note"), "address.note.write");
    assert.equal(scopesForRole("user").some((item) => item.id === "address.group.read"), true);
    assert.equal(scopesForRole("sub").some((item) => item.id === "address.note.write"), true);
    assert.equal(scopesForRole("main").some((item) => item.id === "address.group.write"), true);
});
