"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const sql = fs.readFileSync(
  path.join(root, "supabase/migrations/20261116130000_idea_app_projects_teams.sql"),
  "utf8"
);
const executableSql = sql.replace(/--.*$/gm, "");

test("project module creates only the four intended idea_app tables", () => {
  for (const table of ["projects", "project_members", "project_tasks", "project_updates"]) {
    assert.match(sql, new RegExp("create table idea_app\\." + table, "i"));
  }
  assert.doesNotMatch(sql, /create\s+table\s+(if\s+not\s+exists\s+)?public\./i);
  assert.doesNotMatch(sql, /alter\s+table\s+public\./i);
  assert.doesNotMatch(sql, /drop\s+(table|schema|function)/i);
});

test("project and team relationships use trusted auth identities and isolated foreign keys", () => {
  assert.match(sql, /references idea_app\.organizations\(id\) on delete set null/i);
  assert.match(sql, /references idea_app\.projects\(id\) on delete cascade/i);
  assert.ok((sql.match(/references auth\.users\(id\)/gi) || []).length >= 4);
  assert.match(sql, /unique \(project_id, user_id\)/i);
});

test("all project module tables have RLS enabled", () => {
  for (const table of ["projects", "project_members", "project_tasks", "project_updates"]) {
    assert.match(sql, new RegExp("alter table idea_app\\." + table + " enable row level security", "i"));
  }
});

test("browser roles receive no grants or client policies", () => {
  assert.match(sql, /revoke all on all tables in schema idea_app from public, anon, authenticated/i);
  assert.doesNotMatch(executableSql, /\bgrant\b/i);
  assert.doesNotMatch(sql, /create\s+policy/i);
});

test("project lifecycle, visibility, team roles, and membership states are constrained", () => {
  assert.match(sql, /projects_status_check/i);
  assert.match(sql, /projects_visibility_check/i);
  assert.match(sql, /projects_target_date_check/i);
  assert.match(sql, /project_members_role_check/i);
  assert.match(sql, /project_members_status_check/i);
});

test("tasks have bounded status, priority, ordering, and completion invariants", () => {
  assert.match(sql, /project_tasks_status_check/i);
  assert.match(sql, /project_tasks_priority_check/i);
  assert.match(sql, /project_tasks_sort_order_check/i);
  assert.match(sql, /project_tasks_completed_at_check/i);
});

test("updates cannot be published without a timestamp and use explicit visibility", () => {
  assert.match(sql, /project_updates_visibility_check/i);
  assert.match(sql, /project_updates_publication_status_check/i);
  assert.match(sql, /project_updates_published_at_check/i);
});

test("migration is documented as a draft and depends on the identity foundation", () => {
  assert.match(sql, /NOT applied to any Supabase project/i);
  assert.match(sql, /Depends on: 20261116120000_idea_app_identity_organizations.sql/i);
  assert.match(sql, /Existing public schema is untouched/i);
});
