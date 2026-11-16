"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const blueprint = fs.readFileSync(path.join(root, "supabase/verification/isolated-app-schema-blueprint.md"), "utf8");
const config = fs.readFileSync(path.join(root, "assets/idea-config.js"), "utf8");

test("new app schema is isolated from existing public finance/resource tables", () => {
  assert.match(blueprint, /alohida `idea_app` PostgreSQL sxemasida/);
  assert.match(blueprint, /public\.profiles/);
  assert.match(blueprint, /public\.resources/);
  assert.match(blueprint, /Hozirgi `public` sxemadagi 9 jadval o'z holicha saqlanadi/);
});

test("blueprint defines app entities in a dedicated namespace", () => {
  for (const table of [
    "profiles", "profile_contacts", "organizations", "organization_members",
    "projects", "project_members", "project_tasks", "project_updates",
    "listings", "listing_details", "specialist_profiles", "applications",
    "conversations", "conversation_participants", "messages", "events",
    "event_registrations", "activity_events", "audit_events"
  ]) {
    assert.ok(blueprint.includes("`idea_app." + table + "`"), "missing entity: " + table);
  }
});

test("blueprint requires RLS, minimal grants, and deliberate Data API exposure", () => {
  assert.match(blueprint, /RLS har bir exposed jadvalda yoqiladi/);
  assert.match(blueprint, /schema USAGE va table SELECT\/INSERT\/UPDATE grantlari/);
  assert.match(blueprint, /Data API'ga darhol qo'shilmaydi/);
  assert.match(blueprint, /RLS ham grant o'rnini bosmaydi/);
});

test("blueprint preserves security boundaries while live config uses the public key", () => {
  assert.match(config, /mode: "supabase"/);
  assert.match(config, /sb_publishable_/);
  assert.doesNotMatch(config, /service_role\s*[:=]/i);
  assert.match(blueprint, /Auth provider, SMTP, SMS, email confirmation yoki redirect sozlamalarini egasining tasdig'isiz o'zgartirish/);
  assert.match(blueprint, /hech qanday DDL bajarilmaydi/);
  assert.match(blueprint, /backend ulandi, Auth ishlayapti yoki migration qo'llandi/);
});
