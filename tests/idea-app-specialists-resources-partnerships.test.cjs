"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const sql = fs.readFileSync(path.join(root, "supabase/migrations/20261116170000_idea_app_specialists_resources_partnerships.sql"), "utf8");
const executableSql = sql.replace(/--.*$/gm, "");

test("migration is additive and draft-only", () => {
  assert.match(sql, /NOT applied to any Supabase project/i);
  assert.doesNotMatch(executableSql, /alter\s+table\s+public\./i);
  assert.doesNotMatch(executableSql, /create\s+table\s+public\./i);
  assert.doesNotMatch(executableSql, /drop\s+(table|schema|function)/i);
});

test("all six module tables enable RLS", () => {
  for (const table of ["specialist_profiles","specialist_requests","resource_offers","resource_requests","partnership_opportunities","partnership_enquiries"]) {
    assert.match(sql, new RegExp("alter table idea_app\\." + table + " enable row level security", "i"));
  }
});

test("specialist directory is opt-in and excludes contact identifiers", () => {
  assert.match(sql, /visibility = 'public'/);
  const view = sql.slice(sql.indexOf("create view idea_app.public_specialist_directory"), sql.indexOf("create view idea_app.public_resource_catalogue"));
  assert.match(view, /security_invoker = true/i);
  assert.doesNotMatch(view, /user_id|phone|email|telegram|contact/i);
});

test("resource and partnership public views contain only published records", () => {
  const resource = sql.slice(sql.indexOf("create view idea_app.public_resource_catalogue"), sql.indexOf("create view idea_app.public_partnership_directory"));
  const partnership = sql.slice(sql.indexOf("create view idea_app.public_partnership_directory"), sql.indexOf("-- Grants are narrow"));
  assert.match(resource, /status = 'published'/);
  assert.match(partnership, /status = 'published'/);
  assert.match(resource, /security_invoker = true/i);
  assert.match(partnership, /security_invoker = true/i);
  assert.doesNotMatch(resource + partnership, /owner_id|requester_id|user_id|phone|email/i);
});

test("specialist requests are private to specialist and project reviewers", () => {
  const policy = sql.slice(sql.indexOf("create policy specialist_requests_select_participants"), sql.indexOf("create policy specialist_requests_insert_project_owner"));
  assert.match(policy, /sp\.id = specialist_id and sp\.user_id = \(select auth\.uid\(\)\)/);
  assert.match(policy, /is_project_owner/);
  assert.match(policy, /has_active_project_role/);
});

test("resource requests are private to requester and offer owner", () => {
  const policy = sql.slice(sql.indexOf("create policy resource_requests_select_participants"), sql.indexOf("create policy resource_requests_insert_requester"));
  assert.match(policy, /requester_id = \(select auth\.uid\(\)\)/);
  assert.match(policy, /ro\.owner_id = \(select auth\.uid\(\)\)/);
});

test("partnership enquiries are private to requester and opportunity owner", () => {
  const policy = sql.slice(sql.indexOf("create policy partnership_enquiries_select_participants"), sql.indexOf("create policy partnership_enquiries_insert_requester"));
  assert.match(policy, /requester_id = \(select auth\.uid\(\)\)/);
  assert.match(policy, /po\.owner_id = \(select auth\.uid\(\)\)/);
});

test("state transitions use invoker trigger guards and immutable identity", () => {
  for (const fn of ["guard_specialist_request_transition","guard_resource_request_transition","guard_partnership_enquiry_transition"]) {
    const start = sql.indexOf("function idea_private." + fn + "()");
    const section = sql.slice(start, sql.indexOf("$function$;", start) + 11);
    assert.match(section, /security invoker/i);
    assert.match(section, /set search_path = ''/i);
    assert.match(section, /auth\.uid\(\)/i);
  }
  assert.doesNotMatch(executableSql, /security definer/i);
});

test("opportunities are non-binding and do not create financial transaction tables", () => {
  assert.match(sql, /non-binding/i);
  assert.match(sql, /no payment/i);
  assert.doesNotMatch(executableSql, /create\s+table\s+idea_app\.(payments|bank_accounts|investment_transfers)/i);
});

test("no broad Data API schema exposure or table-wide grants", () => {
  assert.doesNotMatch(executableSql, /pgrst\.db_schemas|alter publication/i);
  assert.doesNotMatch(executableSql, /grant\s+all\s+on\s+all\s+tables/i);
  assert.match(sql, /idea_app must remain unexposed/i);
});

test("read-only preflight covers all new module objects", () => {
  const preflight = fs.readFileSync(path.join(root, "supabase/verification/specialists-resources-partnerships-preflight.sql"), "utf8");
  assert.match(preflight, /^\s*--[\s\S]*select/i);
  assert.doesNotMatch(preflight, /\b(insert|update|delete|alter|create|drop|grant|revoke)\b/i);
  for (const name of ["specialist_profiles","resource_offers","partnership_opportunities","partnership_enquiries"]) {
    assert.ok(preflight.includes(name));
  }
});


test("anonymous catalogue grants exclude internal owner and specialist user IDs", () => {
  const specialistGrant = sql.match(/grant select \(public_name,[\s\S]*?\)\s+on idea_app\.specialist_profiles to anon;/i);
  assert.ok(specialistGrant, "anonymous specialist grant should exist");
  assert.doesNotMatch(specialistGrant[0], /\buser_id\b/i);

  const resourceGrant = sql.match(/grant select \(id, slug,[\s\S]*?\)\s+on idea_app\.resource_offers to anon, authenticated;/i);
  assert.ok(resourceGrant, "resource catalogue grant should exist");
  assert.doesNotMatch(resourceGrant[0], /\bowner_id\b/i);

  const partnershipGrant = sql.match(/grant select \(id, slug,[\s\S]*?\)\s+on idea_app\.partnership_opportunities to anon, authenticated;/i);
  assert.ok(partnershipGrant, "partnership catalogue grant should exist");
  assert.doesNotMatch(partnershipGrant[0], /\bowner_id\b/i);
});

test("specialists can provide a response note when accepting or declining", () => {
  const start = sql.indexOf("if v_actor = old.specialist_id and not v_reviewer");
  const end = sql.indexOf("elsif v_reviewer", start);
  assert.ok(start >= 0 && end > start, "specialist response branch should exist");
  const branch = sql.slice(start, end);
  assert.match(branch, /new\.status in \('accepted','declined'\)/);
  assert.doesNotMatch(branch, /new\.response_note\s*=\s*old\.response_note/i);
  assert.match(sql, /grant update \(status, response_note, responded_at, updated_at\)\s+on idea_app\.specialist_requests to authenticated/i);
});


test("specialist Auth IDs are never selectable; public opaque profile IDs drive requests", () => {
  assert.match(sql, /id uuid primary key default gen_random_uuid\(\),\s*user_id uuid not null unique references auth\.users/i);
  assert.match(sql, /specialist_id uuid not null references idea_app\.specialist_profiles\(id\)/i);
  assert.match(sql, /select id, public_name,[\s\S]*?from idea_app\.specialist_profiles/i);
  assert.doesNotMatch(sql, /grant select \([^;]*\buser_id\b[^;]*\)\s+on idea_app\.specialist_profiles/i);
  assert.match(sql, /select sp\.user_id into v_specialist_user_id[\s\S]*?where sp\.id = old\.specialist_id/i);
});
