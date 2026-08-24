import assert from "node:assert/strict";
import { test } from "node:test";

import {
    hasCredentialHeader,
    isPublicOpenApiPath,
    pickBootstrapSettings,
} from "../src/open_api_access.ts";
import { authorizeApiTokenRequest } from "../src/api_token_scopes.ts";

test("login and bootstrap stay public, settings does not", () => {
    assert.equal(isPublicOpenApiPath("/open_api/bootstrap"), true);
    assert.equal(isPublicOpenApiPath("/open_api/site_login"), true);
    assert.equal(isPublicOpenApiPath("/open_api/admin_login"), true);
    assert.equal(isPublicOpenApiPath("/open_api/credential_login"), true);
    assert.equal(isPublicOpenApiPath("/open_api/settings"), false);
});

test("missing authorization and admin header means no credential", () => {
    assert.equal(hasCredentialHeader(null, null), false);
    assert.equal(hasCredentialHeader("  ", ""), false);
    assert.equal(hasCredentialHeader("Bearer abc", null), true);
    assert.equal(hasCredentialHeader(null, "admin-jwt"), true);
});

test("bootstrap drops smtp and send-mail internals", () => {
    const slim = pickBootstrapSettings({
        title: "企业邮箱管理平台",
        domains: ["bingd.cyou"],
        enableAddressPassword: true,
        smtpImapProxyConfig: { smtp: { host: "secret.internal" } },
        enableSendMail: true,
        enableWebhook: true,
        isS3Enabled: true,
        version: "v1.0",
        statusUrl: "https://status.example",
    });
    assert.equal(slim.title, "企业邮箱管理平台");
    assert.deepEqual(slim.domains, ["bingd.cyou"]);
    assert.equal(slim.enableAddressPassword, true);
    assert.equal("smtpImapProxyConfig" in slim, false);
    assert.equal("enableSendMail" in slim, false);
    assert.equal("enableWebhook" in slim, false);
    assert.equal("isS3Enabled" in slim, false);
    assert.equal("version" in slim, false);
    assert.equal("statusUrl" in slim, false);
});

test("any valid API token may read open settings", () => {
    assert.equal(authorizeApiTokenRequest(["mail.inbox.read"], "GET", "/open_api/settings"), "ok");
});
