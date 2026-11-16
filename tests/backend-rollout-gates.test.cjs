"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const migrationDir = path.join(root, "supabase/migrations");
const migrations = [
  "20261116120000_idea_app_identity_organizations.sql",
  "20261116130000_idea_app_projects_teams.sql",
  "20261116140000_idea_app_projects_rls.sql",
  "20261116150000_idea_app_project_member_commands.sql",
  "20261116160000_idea_app_listings_applications.sql",
  "20261116170000_idea_app_specialists_resources_partnerships.sql",
  "20261116180000_idea_app_storage_private_assets.sql",
  "20261116190000_idea_app_project_commands.sql"
];
const read = (name) => fs.readFileSync(path.join(migrationDir, name), "utf8");

test("all seven app migrations exist in the documented dependency order", () => {
  for (const name of migrations) {
    assert.ok(fs.existsSync(path.join(migrationDir, name)), name + " must exist");
  }
  const readme = fs.readFileSync(path.join(root, "supabase/README.md"), "utf8");
  let previous = -1;
  for (const name of migrations.slice(0, 7)) {
    const index = readme.indexOf(name);
    assert.ok(index > previous, name + " must be listed in order");
    previous = index;
  }
});

test("application migrations are isolated from existing public business tables", () => {
  for (const name of migrations.slice(0, 6)) {
    const sql = read(name).replace(/--.*$/gm, "");
    assert.doesNotMatch(sql, /\b(create|alter|drop|truncate)\s+(table|view|schema)\s+(if\s+not\s+exists\s+)?public\./i, name);
    assert.doesNotMatch(sql, /\b(drop|truncate)\s+(table|schema)\b/i, name);
  }
});

test("every draft is explicitly marked as unapplied", () => {
  for (const name of migrations) {
    assert.match(read(name), /NOT applied to any Supabase project/i, name);
  }
});

test("private Storage draft remains private and scopes every policy to the caller UUID", () => {
  const sql = read(migrations[6]);
  assert.match(sql, /public\s*=\s*false/i);
  assert.match(sql, /'idea-user-assets'[\s\S]*?false,[\s\S]*?10485760/i);
  assert.match(sql, /auth\.uid\(\)::text/i);
  assert.match(sql, /create policy idea_user_assets_select_own/i);
  assert.match(sql, /create policy idea_user_assets_insert_own/i);
  assert.match(sql, /create policy idea_user_assets_update_own/i);
  assert.match(sql, /create policy idea_user_assets_delete_own/i);
  assert.doesNotMatch(sql, /to anon/i);
});

test("frontend remains offline and has no embedded Supabase credentials", () => {
  const config = fs.readFileSync(path.join(root, "assets/idea-config.js"), "utf8");
  assert.match(config, /mode:\s*"offline-demo"/);
  assert.match(config, /url:\s*""/);
  assert.match(config, /anonKey:\s*""/);
  const executableConfig = config.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.doesNotMatch(executableConfig, /(?:service_role|serviceRole|secret_key|password)\s*:/i);
});

test("rollout runbook blocks production, schema exposure, and activation before runtime acceptance", () => {
  const doc = fs.readFileSync(path.join(root, "supabase/verification/backend-rollout-gates.md"), "utf8");
  assert.match(doc, /not deployed/i);
  assert.match(doc, /disposable staging/i);
  assert.match(doc, /two independent authenticated users/i);
  assert.match(doc, /Do \*\*not\*\* expose `idea_app` as a whole/i);
  assert.match(doc, /Production changes require a separate explicit approval/i);
  assert.match(doc, /frontend remains intentionally offline/i);\n  assert.match(doc, /20261116190000_idea_app_project_commands\\.sql/i);\n  assert.match(doc, /dedicated exposed `idea_api` schema/i);
});
