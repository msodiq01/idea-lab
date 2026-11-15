"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const sql = fs.readFileSync(
  path.join(root, "supabase/migrations/20261116140000_idea_app_projects_rls.sql"),
  "utf8"
);
const executableSql = sql.replace(/--.*$/gm, "");

test("RLS migration is additive and targets only idea_app", () => {
  assert.match(sql, /NOT applied to any Supabase project/i);
  assert.match(sql, /create policy projects_select_authorized/i);
  assert.doesNotMatch(executableSql, /alter\s+table\s+public\./i);
  assert.doesNotMatch(executableSql, /drop\s+(table|schema|function)/i);
  assert.doesNotMatch(executableSql, /create\s+table\s+public\./i);
});

test("cross-row helpers use SECURITY DEFINER with fixed search_path and auth.uid", () => {
  for (const fn of ["is_project_owner", "has_active_project_role", "is_organization_owner"]) {
    const start = sql.indexOf("create or replace function idea_app." + fn);
    assert.notEqual(start, -1, fn + " exists");
    const bodyEnd = sql.indexOf("$function$;", sql.indexOf("as $function$", start));
    const body = sql.slice(start, bodyEnd + 11);
    assert.match(body, /security definer/i);
    assert.match(body, /set search_path = pg_catalog, idea_app/i);
    assert.match(body, /auth\.uid\(\)/i);
    assert.doesNotMatch(body, /execute\s+|format\s*\(/i);
  }
});

test("helper functions are not executable by PUBLIC or anon", () => {
  assert.match(sql, /revoke all on function idea_app\.is_project_owner\(uuid\) from public, anon, authenticated/i);
  assert.match(sql, /revoke all on function idea_app\.has_active_project_role\(uuid, text\[\]\) from public, anon, authenticated/i);
  assert.match(sql, /revoke all on function idea_app\.is_organization_owner\(uuid\) from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function idea_app\.is_project_owner\(uuid\) to authenticated/i);
  assert.match(sql, /grant execute on function idea_app\.has_active_project_role\(uuid, text\[\]\) to authenticated/i);
  assert.match(sql, /grant execute on function idea_app\.is_organization_owner\(uuid\) to authenticated/i);
});

test("each project table policy explicitly targets authenticated", () => {
  const names = [
    "projects_select_authorized", "projects_insert_owner", "projects_update_owner", "projects_delete_owner",
    "project_members_select_participants", "project_members_insert_request_or_invitation", "project_members_delete_owner_or_manager",
    "project_tasks_select_team", "project_tasks_insert_team", "project_tasks_update_creator", "project_tasks_delete_owner_or_manager",
    "project_updates_select_team_or_public", "project_updates_insert_team", "project_updates_update_author", "project_updates_delete_author_or_manager"
  ];
  for (const name of names) {
    const start = sql.indexOf("create policy " + name);
    assert.notEqual(start, -1, name + " exists");
    const end = sql.indexOf(";", start);
    assert.match(sql.slice(start, end), /to authenticated/i, name + " is authenticated-only");
  }
});

test("self-service membership creates only pending contributor/viewer requests", () => {
  const start = sql.indexOf("create policy project_members_insert_request_or_invitation");
  const end = sql.indexOf(";", start);
  const statement = sql.slice(start, end);
  assert.match(statement, /user_id = \(select auth\.uid\(\)\)/i);
  assert.match(statement, /membership_role in \('contributor', 'viewer'\)/i);
  assert.match(statement, /membership_status = 'pending'/i);
  assert.match(statement, /invited_by is null/i);
  assert.doesNotMatch(statement, /membership_status = 'active'/i);
});

test("membership transitions are not client-updatable", () => {
  assert.doesNotMatch(executableSql, /create policy\s+\S+\s+on idea_app\.project_members\s+for update/i);
});

test("task writes bind creator and assignee to the current user", () => {
  const start = sql.indexOf("create policy project_tasks_insert_team");
  const end = sql.indexOf(";", start);
  const statement = sql.slice(start, end);
  assert.match(statement, /created_by = \(select auth\.uid\(\)\)/i);
  assert.match(statement, /assignee_id is null or assignee_id = \(select auth\.uid\(\)\)/i);
});

test("public updates require published state and a public parent project", () => {
  const start = sql.indexOf("create policy project_updates_select_team_or_public");
  const end = sql.indexOf(";", start);
  const statement = sql.slice(start, end);
  assert.match(statement, /visibility = 'public'/i);
  assert.match(statement, /publication_status = 'published'/i);
  assert.match(statement, /p\.visibility = 'public'/i);
  assert.match(statement, /p\.status in \('recruiting', 'active', 'completed'\)/i);
});

test("migration does not grant browser table privileges", () => {
  assert.match(sql, /grant usage on schema idea_app to authenticated/i);
  assert.doesNotMatch(executableSql, /grant\s+(select|insert|update|delete|all)\s+on\s+(all\s+tables|idea_app\.)/i);
});
