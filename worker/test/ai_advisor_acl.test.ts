import assert from "node:assert/strict";
import { test } from "node:test";

import { isForbiddenForSubAdmin } from "../src/admin_quota.ts";
import { flattenSql } from "../src/d1_sql.ts";

test("sub-admins can hit advisor driver routes but not policy", () => {
    assert.equal(isForbiddenForSubAdmin("/admin/ai_advisor/models", "GET"), false);
    assert.equal(isForbiddenForSubAdmin("/admin/ai_advisor/provider", "POST"), false);
    assert.equal(isForbiddenForSubAdmin("/admin/ai_advisor/test", "POST"), false);
    assert.equal(isForbiddenForSubAdmin("/admin/ai_advisor/policy", "GET"), true);
    assert.equal(isForbiddenForSubAdmin("/admin/ai_advisor/policy", "POST"), true);
});

test("flattenSql keeps a CREATE TABLE as one statement so D1 exec cannot split on newlines", () => {
    const sql = `CREATE TABLE IF NOT EXISTS ai_advisor_auth (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actor_type TEXT NOT NULL
    );`;
    const flat = flattenSql(sql);
    assert.equal(flat.includes("\n"), false);
    assert.equal(flat.startsWith("CREATE TABLE IF NOT EXISTS ai_advisor_auth ("), true);
    assert.equal(flat.endsWith(");"), true);
});
