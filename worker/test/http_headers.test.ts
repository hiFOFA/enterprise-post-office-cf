import assert from "node:assert/strict";
import { test } from "node:test";

import { withUtf8Charset } from "../src/http_headers.ts";

test("json without charset gets UTF-8", () => {
    assert.equal(withUtf8Charset("application/json"), "application/json; charset=UTF-8");
});

test("html without charset gets UTF-8", () => {
    assert.equal(withUtf8Charset("text/html"), "text/html; charset=UTF-8");
});

test("existing charset is left alone", () => {
    assert.equal(
        withUtf8Charset("application/json; charset=utf-8"),
        "application/json; charset=utf-8",
    );
});

test("unrelated types stay unchanged", () => {
    assert.equal(withUtf8Charset("text/javascript"), "text/javascript");
    assert.equal(withUtf8Charset(null), null);
});
