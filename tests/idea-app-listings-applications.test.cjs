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

test("listings and applications migration is additive and draft-only", () => {
  assert.match(sql, /NOT applied to any Supabase project/i);
  assert.doesNotMatch(executableSql, /alter\\s+table\\s+public\\./i);
  assert.doesNotMatch(executableSql, /drop\\s+(table|schema|function)/i);
  assert.doesNotMatch(executableSql, /create\\s+table\\s+public\\./i);
});

test("public directory uses safe invoker views and omits internal identifiers", () => {
  assert.match(sql, /create view idea_app\\.public_project_directory[\\s\\S]*?security_invoker = true/i);
  assert.match(sql, /create view idea_app\\.public_project_updates[\\s\\S]*?security_invoker = true/i);
  const directory = sql.slice(sql.indexOf("create view idea_app.public_project_directory"), sql.indexOf("create view idea_app.public_project_updates"));
  assert.doesNotMatch(directory, /p\\.created_by|owner_id|phone|email|project_id/i);
  assert.match(directory, /l\\.listing_status = 'published'/i);
  assert.match(directory, /p\\.visibility = 'public'/i);
});

test("public updates expose published public content only", () => {
  const view = sql.slice(sql.indexOf("create view idea_app.public_project_updates"), sql.indexOf("-- The views are intentionally"));
  assert.match(view, /u\\.visibility = 'public'/i);
  assert.match(view, /u\\.publication_status = 'published'/i);
  assert.doesNotMatch(view, /author_id|applicant_id|reviewer_note/i);
});

test("applications are unique per applicant and project and start submitted", () => {
  assert.match(sql, /unique \(project_id, applicant_id\)/i);
  assert.match(sql, /status text not null default 'submitted'/i);
  assert.match(sql, /applicant_id = \(select auth\\.uid\(\)\)/i);
  assert.match(sql, /l\\.listing_status = 'published'/i);
  assert.match(sql, /p\\.status = 'recruiting'/i);
});

test("application visibility is limited to applicant and project reviewers", () => {
  assert.match(sql, /applications_select_participants[\\s\\S]*?applicant_id = \(select auth\\.uid\(\)\)/i);
  assert.match(sql, /is_project_owner\(project_id\)/i);
  assert.match(sql, /has_active_project_role\(project_id, array\['manager'\]/i);
});

test("application state transitions use an invoker trigger and immutable applicant content", () => {
  assert.match(sql, /function idea_private\\.guard_application_transition\(\)[\\s\\S]*?security invoker[\\s\\S]*?set search_path = ''/i);
  assert.match(sql, /create trigger applications_guard_transition/i);
  assert.match(sql, /Application identity and applicant content are immutable/i);
  assert.match(sql, /new\\.status = 'withdrawn'/i);
  assert.match(sql, /new\\.status in \('in_review', 'accepted', 'rejected'\)/i);
  assert.doesNotMatch(executableSql, /security definer/i);
});

test("grants are narrow and schema exposure is not enabled", () => {
  assert.match(sql, /grant select on idea_app\\.public_project_directory, idea_app\\.public_project_updates/i);
  assert.match(sql, /grant update \(status, reviewer_note, reviewed_at, updated_at\)/i);
  assert.doesNotMatch(executableSql, /alter publication|pgrst\\.db_schemas/i);
  assert.doesNotMatch(executableSql, /grant all on all tables/i);
});
