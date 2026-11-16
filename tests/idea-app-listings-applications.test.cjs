"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const sql = fs.readFileSync(
  path.join(root, "supabase/migrations/20261116160000_idea_app_listings_applications.sql"),
  "utf8"
);
const executableSql = sql.replace(/--.*$/gm, "");

test("migration is additive and repository-draft only", () => {
  assert.ok(sql.includes("NOT applied to any Supabase project"));
  assert.doesNotMatch(executableSql, /alter\s+table\s+public[.]/i);
  assert.doesNotMatch(executableSql, /drop\s+(table|schema|function)/i);
  assert.doesNotMatch(executableSql, /create\s+table\s+public[.]/i);
});

test("public projections are invoker views and select only display fields", () => {
  assert.ok(sql.includes("create view idea_app.public_project_directory"));
  assert.ok(sql.includes("create view idea_app.public_project_updates"));
  assert.ok(sql.includes("with (security_invoker = true)"));
  const directory = sql.slice(sql.indexOf("create view idea_app.public_project_directory"), sql.indexOf("create view idea_app.public_project_updates"));
  const selected = directory.split("from idea_app.project_listings")[0];
  assert.doesNotMatch(selected, /created_by|owner_id|phone|email|project_id/i);
  assert.ok(directory.includes("l.listing_status = 'published'"));
  assert.ok(directory.includes("p.visibility = 'public'"));
});

test("anonymous listing reads require a published public project", () => {
  const start = sql.indexOf("create policy project_listings_public_read");
  const end = sql.indexOf("create policy project_listings_owner_read", start);
  assert.notEqual(start, -1, "public listing policy exists");
  const policy = sql.slice(start, end);
  assert.match(policy, /listing_status = 'published'/i);
  assert.match(policy, /p\.visibility = 'public'/i);
  assert.match(policy, /p\.status in \('recruiting', 'active', 'completed'\)/i);
});

test("public update projection filters to published public updates", () => {
  const view = sql.slice(sql.indexOf("create view idea_app.public_project_updates"), sql.indexOf("-- The views are intentionally"));
  assert.ok(view.includes("u.visibility = 'public'"));
  assert.ok(view.includes("u.publication_status = 'published'"));
  assert.doesNotMatch(view, /author_id|applicant_id|reviewer_note/i);
});

test("applications are unique and applicant identity is server-bound", () => {
  assert.ok(sql.includes("unique (project_id, applicant_id)"));
  assert.ok(sql.includes("status text not null default 'submitted'"));
  assert.ok(sql.includes("applicant_id = (select auth.uid())"));
  assert.ok(sql.includes("l.listing_status = 'published'"));
  assert.ok(sql.includes("p.status = 'recruiting'"));
});

test("applications are visible only to participants and project reviewers", () => {
  const policy = sql.slice(sql.indexOf("create policy applications_select_participants"), sql.indexOf("create policy applications_insert_applicant"));
  assert.ok(policy.includes("applicant_id = (select auth.uid())"));
  assert.ok(policy.includes("idea_private.is_project_owner(project_id)"));
  assert.ok(policy.includes("idea_private.has_active_project_role(project_id, array['manager']"));
});

test("application transitions are guarded by an invoker trigger", () => {
  assert.ok(sql.includes("function idea_private.guard_application_transition()"));
  assert.ok(sql.includes("security invoker"));
  assert.ok(sql.includes("set search_path = ''"));
  assert.ok(sql.includes("create trigger applications_guard_transition"));
  assert.ok(sql.includes("Application identity and applicant content are immutable"));
  assert.ok(sql.includes("new.status = 'withdrawn'"));
  assert.ok(sql.includes("new.status in ('in_review', 'accepted', 'rejected')"));
  assert.doesNotMatch(executableSql, /security definer/i);
});

test("Data API exposure remains disabled and grants are not table-wide", () => {
  assert.ok(sql.includes("grant select on idea_app.public_project_directory, idea_app.public_project_updates"));
  assert.ok(sql.includes("grant update (status, reviewer_note, reviewed_at, updated_at)"));
  assert.doesNotMatch(executableSql, /alter publication|pgrst[.]db_schemas/i);
  assert.doesNotMatch(executableSql, /grant all on all tables/i);
});

test("listings and applications preflight is read-only", () => {
  const preflight = fs.readFileSync(
    path.join(root, "supabase/verification/listings-applications-preflight.sql"),
    "utf8"
  );
  assert.match(preflight, /^\s*--[\s\S]*select/i);
  assert.doesNotMatch(preflight, /\b(insert|update|delete|alter|create|drop|grant|revoke)\b/i);
  assert.ok(preflight.includes("applications"));
  assert.ok(preflight.includes("public_project_directory"));
});
