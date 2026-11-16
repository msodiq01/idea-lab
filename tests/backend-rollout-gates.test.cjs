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

test("all eight app migrations exist in the documented dependency order", () => {
  for (const name of migrations) assert.ok(fs.existsSync(path.join(migrationDir, name)), name + " must exist");
  const readme = fs.readFileSync(path.join(root, "supabase/README.md"), "utf8");
  const section = readme.slice(readme.indexOf("## Yangi IDEA LAB app migration tartibi"));
  let previous = -1;
  for (const name of migrations) {
    const index = section.indexOf(name);
    assert.ok(index > previous, name + " must be listed in order");
    previous = index;
  }
});

test("application migrations are isolated from existing public business tables", () => {
  for (const name of migrations.slice(0, 7)) {
    const sql = read(name).replace(/--.*$/gm, "");
    assert.doesNotMatch(sql, /\b(create|alter|drop|truncate)\s+(table|view|schema)\s+(if\s+not\s+exists\s+)?public\./i, name);
    assert.doesNotMatch(sql, /\b(drop|truncate)\s+(table|schema)\b/i, name);
  }
});

test("every draft is explicitly marked as unapplied", () => {
  for (const name of migrations) assert.match(read(name), /NOT applied to any Supabase project/i, name);
});

test("every created idea_app table has RLS enabled in the migration set", () => {
  const sql = migrations.map(read).join("
");
  const tables = [...sql.matchAll(/create table\s+idea_app\.(\w+)/gi)].map(match => match[1]);
  const enabled = new Set([...sql.matchAll(/alter table\s+idea_app\.(\w+)\s+enable row level security/gi)].map(match => match[1]));
  assert.equal(tables.length, 16, "expected the 16 reviewed application tables");
  for (const table of tables) assert.ok(enabled.has(table), table + " must have RLS enabled");
});

test("every UPDATE RLS policy includes USING and WITH CHECK", () => {
  const sql = migrations.slice(2, 6).map(read).join("
");
  const policies = sql.match(/create policy[\s\S]*?;/gi) || [];
  const updatePolicies = policies.filter(policy => /\bfor\s+update\b/i.test(policy));
  assert.ok(updatePolicies.length > 0, "expected UPDATE policies");
  for (const policy of updatePolicies) {
    assert.match(policy, /\busing\s*\(/i, policy);
    assert.match(policy, /\bwith\s+check\s*\(/i, policy);
  }
});

test("SECURITY DEFINER helpers are private, caller-bound, and explicitly granted", () => {
  const sql = migrations.slice(2, 6).map(read).join("
");
  const functions = [...sql.matchAll(/create(?: or replace)? function\s+([\w.]+)\s*\([\s\S]*?\$function\$;/gi)];
  const definers = functions.filter(match => /\bsecurity\s+definer\b/i.test(match[0]));
  assert.equal(definers.length, 7, "expected seven reviewed private authorization helpers");
  assert.doesNotMatch(sql, /create(?: or replace)? function\s+public\./i);
  for (const match of definers) {
    const name = match[1];
    assert.match(match[0], /set\s+search_path\s*=\s*\x27\x27/i, name);
    assert.match(match[0], /auth\.uid\s*\(\s*\)/i, name);
    const escaped = name.replace(/\./g, "\\.");
    const tail = sql.slice(match.index + match[0].length);
    const revoke = tail.match(new RegExp("revoke all on function\\s+" + escaped + "[\\s\\S]*?;", "i"));
    assert.ok(revoke, name + " must have an explicit revoke");
    assert.match(revoke[0], /from\s+public\s*,\s*anon\s*,\s*authenticated/i, name);
    const grant = tail.match(new RegExp("grant execute on function\\s+" + escaped + "[\\s\\S]*?;", "i"));
    assert.ok(grant, name + " must have an explicit execute grant");
    assert.match(grant[0], /to\s+authenticated/i, name);
  }
});

test("private Storage draft remains private and scopes every policy to the caller UUID", () => {
  const sql = read(migrations[6]);
  assert.match(sql, /public\s*=\s*false/i);
  assert.match(sql, /\x27idea-user-assets\x27[\s\S]*?false,[\s\S]*?10485760/i);
  assert.match(sql, /auth\.uid\(\)::text/i);
  for (const name of ["select", "insert", "update", "delete"]) assert.match(sql, new RegExp("create policy idea_user_assets_" + name + "_own", "i"));
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

test("rollout runbook blocks production and requires the dedicated API boundary", () => {
  const doc = fs.readFileSync(path.join(root, "supabase/verification/backend-rollout-gates.md"), "utf8");
  assert.match(doc, /not deployed/i);
  assert.match(doc, /disposable staging/i);
  assert.match(doc, /two independent authenticated users/i);
  assert.match(doc, /Do \*\*not\*\* expose `idea_app` as a whole/i);
  assert.match(doc, /Production changes require a separate explicit approval/i);
  assert.match(doc, /frontend remains intentionally offline/i);
  assert.match(doc, /20261116190000_idea_app_project_commands\.sql/i);
  assert.match(doc, /dedicated exposed `idea_api` schema/i);
});
