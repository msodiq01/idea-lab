"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const schema = fs.readFileSync(path.join(root, "supabase/schema.sql"), "utf8");
const audit = fs.readFileSync(path.join(root, "supabase/verification/live-schema-compatibility.md"), "utf8");
const config = fs.readFileSync(path.join(root, "assets/idea-config.js"), "utf8");

test("compatibility gate records the exact application schema table set", () => {
  const tables = [...schema.matchAll(/create\s+table\s+if\s+not\s+exists\s+public\.([a-z0-9_]+)/gi)].map(match => match[1]);
  assert.equal(tables.length, 19);
  for (const table of tables) assert.ok(audit.includes("`" + table + "`"), "missing documented table: " + table);
});

test("compatibility gate records the nine live tables and migration baseline", () => {
  for (const table of ["profiles", "user_roles", "resource_types", "resources", "resource_accounts", "investments", "money_transfers", "transfer_allocations", "audit_logs"]) {
    assert.match(audit, new RegExp("`" + table + "`"));
  }
  for (const version of ["20261115180838", "20261115180902", "20261115180930", "20261115181211"]) {
    assert.ok(audit.includes(version), "missing live migration " + version);
  }
});

test("compatibility gate preserves baseline caution while live backend is enabled", () => {
  assert.match(audit, /to‘g‘ridan-to‘g‘ri qo‘llash mumkin emas/);
  assert.match(audit, /Hozir bajarilmasligi kerak bo‘lgan ishlar/);
  assert.match(audit, /ikki foydalanuvchili RLS sinovini ishlab turgan yagona loyiha ustida o‘tkazish/i);
  assert.match(config, /mode: "supabase"/);
  assert.match(config, /Two-account isolation is the next required acceptance test/i);
  assert.match(config, /Never place service_role, database passwords, JWT secrets, or provider secrets here/i);
});

test("compatibility gate documents profile and resource semantic mismatches", () => {
  assert.match(audit, /profiles.*status.*roles/s);
  assert.match(audit, /resources.*resource_type_id.*visibility.*target_amount/s);
  assert.match(audit, /repository.*resources.*category.*price.*contact/s);
});

test("compatibility gate distinguishes static readiness from live verification", () => {
  assert.match(audit, /Auth ishlayapti/);
  assert.match(audit, /ikki-user RLS sinovi o‘tdi degani emas/);
});
