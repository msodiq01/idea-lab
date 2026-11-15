"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const sql = fs.readFileSync(
  path.join(root, "supabase/migrations/20261116120000_idea_app_identity_organizations.sql"),
  "utf8"
);
const executableSql = sql.replace(/--.*$/gm, "");

test("identity and organization foundation creates only isolated idea_app objects", () => {
  assert.match(sql, /create schema idea_app/i);
  assert.match(sql, /create table idea_app\.profiles/i);
  assert.match(sql, /create table idea_app\.profile_contacts/i);
  assert.match(sql, /create table idea_app\.organizations/i);
  assert.match(sql, /create table idea_app\.organization_members/i);
  assert.doesNotMatch(sql, /create\s+table\s+(if\s+not\s+exists\s+)?public\./i);
  assert.doesNotMatch(sql, /alter\s+table\s+public\./i);
  assert.doesNotMatch(sql, /drop\s+(table|schema|function)/i);
});

test("all four tables reference trusted auth identities and enable RLS", () => {
  for (const table of ["profiles", "profile_contacts", "organizations", "organization_members"]) {
    assert.match(sql, new RegExp("alter table idea_app\\." + table + " enable row level security", "i"));
  }
  assert.ok((sql.match(/references auth\.users\(id\)/gi) || []).length >= 4);
});

test("browser roles receive no schema or table privileges and no policies are added", () => {
  assert.match(sql, /revoke all on schema idea_app from public, anon, authenticated/i);
  assert.match(sql, /revoke all on all tables in schema idea_app from public, anon, authenticated/i);
  assert.doesNotMatch(sql, /\bgrant\b/i);
  assert.doesNotMatch(sql, /create\s+policy/i);
});

test("profile and organization constraints reject unsafe or malformed values", () => {
  assert.match(sql, /profiles_username_format/i);
  assert.match(sql, /profiles_visibility_check/i);
  assert.match(sql, /profile_contacts_phone_format/i);
  assert.match(sql, /profile_contacts_visibility_check/i);
  assert.match(sql, /organizations_slug_format/i);
  assert.match(sql, /organizations_status_check/i);
  assert.match(sql, /organization_members_role_check/i);
  assert.match(sql, /organization_members_status_check/i);
});

test("migration is explicitly documented as a draft and leaves existing public tables untouched", () => {
  assert.match(sql, /NOT applied to any Supabase project/i);
  assert.match(sql, /Existing public schema is untouched/i);
  assert.match(sql, /No Data API exposure, client grants, or RLS policies/i);
});
