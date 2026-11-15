"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

const contract = read("BACKEND-INTEGRATION-CONTRACT.md");
const runbook = read("DATA-MIGRATION-RUNBOOK.md");
const review = read("BACKEND-SECURITY-REVIEW.md");
const migration = read("supabase/migrations/20261115_security_hardening.sql");
const schema = read("supabase/schema.sql");
const audit = read("supabase/verification/security_audit.sql");
const rlsPlan = read("supabase/verification/rls-test-plan.md");
const mapping = read("LEGACY-DATA-MAPPING.md");
const env = read(".env.example");

test("Backend remains explicitly disabled until credentials and project are confirmed", () => {
  assert.match(contract, /backend ulanmagan/);
  assert.match(env, /IDEA_LAB_BACKEND_MODE=offline-demo/);
  assert.match(env, /SUPABASE_URL=\s*$/m);
  assert.match(env, /SUPABASE_ANON_KEY=\s*$/m);
});
test("Public directory contract uses the restricted views", () => {
  for (const view of ["projects_public","teams_public","job_posts_public","specialist_profiles_public","offers_public","investors_public","resources_public"]) {
    assert.ok(migration.includes("public."+view), view);
  }
  assert.match(migration, /grant select on public\.projects_public to authenticated/i);
  assert.match(migration, /revoke all on public\.projects_public from anon/i);
});
test("Public projections do not select private contact and resume fields", () => {
  const viewBlocks = migration.split(/create or replace view public\./i).slice(1);
  assert.equal(viewBlocks.length, 7);
  for (const block of viewBlocks) {
    const select = block.split(/from public\./i)[0];
    for (const privateField of ["phone","email","telegram","resume_path","owner_id"]) {
      assert.doesNotMatch(select, new RegExp("\\b"+privateField+"\\b","i"), privateField);
    }
  }
});
test("Role escalation guard is present in the security migration", () => {
  assert.match(migration, /prevent_self_role_escalation/);
  assert.match(migration, /new\.roles is distinct from old\.roles/);
});
test("Applications are tied to the authenticated applicant and active target", () => {
  for (const table of ["project_investment_applications","team_applications","job_applications","offer_applications","resource_orders"]) {
    assert.ok(migration.includes("on public."+table), table);
  }
  assert.match(migration, /investor_user_id = auth\.uid\(\)/);
  assert.match(migration, /applicant_id = auth\.uid\(\)/);
  assert.match(migration, /requester_id = auth\.uid\(\)/);
  assert.match(migration, /j\.status = 'active'/);
  assert.match(migration, /o\.status = 'active'/);
});
test("Project task identity guard protects project and creator linkage", () => {
  assert.match(migration, /guard_project_task_identity/);
  assert.match(migration, /new\.project_id is distinct from old\.project_id/);
  assert.match(migration, /new\.created_by is distinct from old\.created_by/);
});
test("Base schema enables RLS on core account and application tables", () => {
  for (const table of ["profiles","projects","teams","job_posts","offer_applications","resource_orders","project_tasks"]) {
    assert.match(schema, new RegExp("alter table public\\."+table+" enable row level security","i"), table);
  }
});
test("Migration guide requires staging, backup, and forbids premature import", () => {
  assert.match(runbook, /Hozircha importni boshlamang/);
  assert.match(runbook, /backup/i);
  assert.match(runbook, /staging/i);
  assert.match(runbook, /localStorage yozuvlari o'chirilmaydi/);
});
test("Security verification SQL is read-only and checks RLS, views, grants, and policies", () => {
  assert.match(audit, /pg_class/);
  assert.match(audit, /information_schema\.columns/);
  assert.match(audit, /role_table_grants/);
  assert.match(audit, /pg_policies/);
  assert.match(audit, /pg_views/);
  assert.doesNotMatch(audit, /^\s*(insert|update|delete|drop|alter|create)\b/im);
});
test("Two-account RLS plan and legacy mapping cover unresolved ownership", () => {
  for (const id of ["RLS-01","RLS-08","RLS-09","RLS-14","RLS-15"]) assert.ok(rlsPlan.includes(id), id);
  assert.match(mapping, /ideaLabExchangeItems/);
  assert.match(mapping, /avtomatik birlashtirish mumkin emas/);
  assert.match(mapping, /Karantin/);
});
test("Security review states what remains unverified", () => {
  assert.match(review, /statik kod ko'rigi/);
  assert.match(review, /jonli Supabase loyihasida bajarilmagan/);
  assert.match(review, /penetration test emas/);
});
