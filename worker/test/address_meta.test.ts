import assert from "node:assert/strict";
import { test } from "node:test";

import {
    buildAdminSourceMeta,
    canCreateMoreGroups,
    displayAddressName,
    formatOwnerDisplay,
    normalizeGroupLimits,
    normalizeNote,
    parseOptionalGroupId,
} from "../src/address_meta.ts";

test("web create writes admin:username without :api", () => {
    assert.equal(buildAdminSourceMeta("神人来的", false), "admin:神人来的");
    assert.equal(buildAdminSourceMeta("", false), "admin:main");
});

test("api token create appends :api", () => {
    assert.equal(buildAdminSourceMeta("神人来的", true), "admin:神人来的:api");
});

test("owner column shows username, and -api only for token creates", () => {
    assert.equal(formatOwnerDisplay({
        ownerUsername: "神人来的",
        sourceMeta: "admin:神人来的",
    }), "神人来的");
    assert.equal(formatOwnerDisplay({
        ownerUsername: "神人来的",
        sourceMeta: "admin:神人来的:api",
    }), "神人来的-api");
    assert.equal(formatOwnerDisplay({
        ownerUsername: "神人来的",
        sourceMeta: "1.2.3.4",
    }), "神人来的");
});

test("name column prefers a trimmed note over the email", () => {
    assert.equal(displayAddressName("  客户A  ", "a@mail.example.com"), "客户A");
    assert.equal(displayAddressName("", "a@mail.example.com"), "a@mail.example.com");
    assert.equal(displayAddressName(null, "a@mail.example.com"), "a@mail.example.com");
});

test("group limits default to 10/10 and main is unlimited", () => {
    assert.deepEqual(normalizeGroupLimits(null), { sub: 10, user: 10 });
    assert.deepEqual(normalizeGroupLimits({ sub: 3, user: 8 }), { sub: 3, user: 8 });
    assert.equal(canCreateMoreGroups("main", 999, { sub: 10, user: 10 }), true);
    assert.equal(canCreateMoreGroups("sub", 10, { sub: 10, user: 10 }), false);
    assert.equal(canCreateMoreGroups("sub", 9, { sub: 10, user: 10 }), true);
    assert.equal(canCreateMoreGroups("user", 10, { sub: 10, user: 10 }), false);
});

test("optional group_id is empty or a positive integer", () => {
    assert.equal(parseOptionalGroupId(undefined), null);
    assert.equal(parseOptionalGroupId(null), null);
    assert.equal(parseOptionalGroupId(""), null);
    assert.equal(parseOptionalGroupId(3), 3);
    assert.equal(parseOptionalGroupId("12"), 12);
    assert.throws(() => parseOptionalGroupId(0), /InvalidGroupId/);
    assert.throws(() => parseOptionalGroupId("x"), /InvalidGroupId/);
});

test("notes are trimmed and capped", () => {
    assert.equal(normalizeNote("  hello  "), "hello");
    assert.equal(normalizeNote("   "), "");
    assert.equal(normalizeNote("x".repeat(300)).length, 200);
});
