"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function load(entries = {}) {
  const map = new Map(Object.entries(entries));
  let writes = 0;
  const storage = {
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem() { writes++; throw new Error("write must not occur"); },
    removeItem() { writes++; throw new Error("remove must not occur"); }
  };
  const context = { TextEncoder, encodeURIComponent, unescape, Object, Array, Set, Map, String, Number, JSON, Math };
  context.window = context;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../assets/idea-data-audit.js"), "utf8"), context);
  return { api: context.IDEALAB_DATA_AUDIT, storage, writes: () => writes };
}
const codes = result => result.findings.map(item => item.code);

test("01 exposes a read-only audit API", () => assert.equal(load().api.audit().readOnly, true));
test("02 lists only approved legacy keys", () => assert.ok(load().api.allowedKeys.includes("projects")));
test("03 does not mutate storage", () => { const x=load({projects:"[]"}); x.api.audit({storage:x.storage}); assert.equal(x.writes(),0); });
test("04 reports missing keys without errors", () => assert.equal(load().api.audit().summary.foundKeys,0));
test("05 parses valid JSON arrays", () => assert.equal(load({projects:"[]"}).api.audit().summary.parsedKeys,1));
test("06 detects malformed JSON", () => assert.ok(codes(load({projects:"{"}).api.audit()).includes("INVALID_JSON")));
test("07 detects duplicate IDs", () => assert.ok(codes(load({projects:'[{"id":"a"},{"id":"a"}]'}).api.audit()).includes("DUPLICATE_RECORD_ID")));
test("08 detects missing IDs", () => assert.ok(codes(load({projects:'[{"name":"x"}]'}).api.audit()).includes("MISSING_RECORD_ID")));
test("09 detects non-object array members", () => assert.ok(codes(load({projects:'[null,4,{"id":"x"}]'}).api.audit()).includes("NON_OBJECT_RECORD")));
test("10 detects empty object records", () => assert.ok(codes(load({projects:'[{}]'}).api.audit()).includes("EMPTY_RECORD")));
test("11 detects empty arrays", () => assert.ok(codes(load({projects:"[]"}).api.audit()).includes("EMPTY_COLLECTION")));
test("12 detects null root values", () => assert.ok(codes(load({projects:"null"}).api.audit()).includes("NULL_ROOT_VALUE")));
test("13 detects empty root objects", () => assert.ok(codes(load({userProfile:"{}"}).api.audit()).includes("EMPTY_OBJECT")));
test("14 reports exact collection counts", () => assert.equal(load({projects:'[{"id":"1"},{"id":"2"}]'}).api.audit().summary.totalRecords,2));
test("15 reports byte size", () => assert.ok(load({projects:'[{"id":"1"}]'}).api.audit().summary.totalBytes>0));
test("16 ignores unknown key requests", () => assert.ok(codes(load().api.audit({keys:["passwords"]})).includes("UNKNOWN_KEY_REQUEST")));
test("17 handles unavailable storage", () => assert.equal(load().api.audit({storage:null}).ok,false));
test("18 handles storage read exceptions", () => { const r=load().api.audit({storage:{getItem(){throw Error("x");}}}); assert.ok(codes(r).includes("KEY_READ_FAILED")); });
test("19 detects oversized storage entries", () => assert.ok(codes(load({projects:JSON.stringify("x".repeat(1024*1024+1))}).api.audit()).includes("LARGE_STORAGE_ENTRY")));
test("20 flags a dataset larger than five megabytes", () => assert.ok(codes(load({projects:JSON.stringify("x".repeat(5*1024*1024+1))}).api.audit()).includes("LARGE_TOTAL_DATASET")));
test("21 returns a safe inventory without record contents", () => { const r=load({projects:'[{"id":"1","email":"secret@example.com"}]'}).api.audit(); assert.equal(JSON.stringify(r).includes("secret@example.com"),false); });
test("22 marks clean data as okay", () => assert.equal(load({projects:'[{"id":"1","name":"A"}]'}).api.audit().ok,true));
test("23 flags malformed data as not okay", () => assert.equal(load({projects:"broken"}).api.audit().ok,false));
test("24 detects large individual records", () => { const obj={id:"1",payload:"x".repeat(100*1024)}; assert.ok(codes(load({projects:JSON.stringify([obj])}).api.audit()).includes("LARGE_RECORD")); });
