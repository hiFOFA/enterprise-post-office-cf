import assert from "node:assert/strict";
import { test } from "node:test";

import {
    MAIN_OWNER_GROUP_KEY,
    MAIN_OWNER_GROUP_NAME,
    buildDefaultOwnerGroupSpecs,
    ownerGroupKeyForAddress,
    parseDefaultOwnerGroupMap,
    subOwnerGroupKey,
} from "../src/default_owner_groups.ts";

test("two sub-admins produce three default groups: mine plus each sub", () => {
    const specs = buildDefaultOwnerGroupSpecs([
        { id: 1, username: "hi" },
        { id: 2, username: "alice" },
    ]);
    assert.equal(specs.length, 3);
    assert.deepEqual(specs[0], {
        key: MAIN_OWNER_GROUP_KEY,
        name: MAIN_OWNER_GROUP_NAME,
        ownerType: "main",
        ownerId: null,
    });
    assert.equal(specs[0].name, "我自己开的");
    assert.equal(specs[1].key, subOwnerGroupKey(1));
    assert.equal(specs[1].name, "hi");
    assert.equal(specs[2].key, subOwnerGroupKey(2));
    assert.equal(specs[2].name, "alice");
});

test("one sub-admin produces two default groups", () => {
    const specs = buildDefaultOwnerGroupSpecs([{ id: 1, username: "hi" }]);
    assert.equal(specs.length, 2);
    assert.equal(specs[1].name, "hi");
});

test("addresses go to the matching owner group, untagged to mine", () => {
    assert.equal(ownerGroupKeyForAddress("sub", 1), "sub:1");
    assert.equal(ownerGroupKeyForAddress("main", null), MAIN_OWNER_GROUP_KEY);
    assert.equal(ownerGroupKeyForAddress(null, null), MAIN_OWNER_GROUP_KEY);
    assert.equal(ownerGroupKeyForAddress("sub", "x"), MAIN_OWNER_GROUP_KEY);
});

test("owner group map keeps only valid group ids", () => {
    assert.deepEqual(parseDefaultOwnerGroupMap({
        main: 12,
        "sub:1": 13,
        junk: "no",
        "sub:2": 0,
    }), { main: 12, "sub:1": 13 });
});
