"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const sql = fs.readFileSync(path.join(root, "supabase/migrations/20261116170000_idea_app_specialists_resources_partnerships.sql"), "utf8");
const executableSql = sql.replace(/--.*$/gm, "");

test("migration is additive and production-applied", () => {
  assert.match(sql, /applied to Supabase production project idea-lab/i);
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
  assert.match(policy, /idea_private\.is_specialist_profile_owner\(specialist_id\)/);
  assert.match(policy, /is_project_owner/);
  assert.match(policy, /has_active_project_role/);
});

test("resource requests are private to requester and offer owner", () => {
  const policy = sql.slice(sql.indexOf("create policy resource_requests_select_participants"), sql.indexOf("create policy resource_requests_insert_requester"));
  assert.match(policy, /requester_id = \(select auth\.uid\(\)\)/);
  assert.match(policy, /idea_private\.is_resource_offer_owner\(offer_id\)/);
});

test("partnership enquiries are private to requester and opportunity owner", () => {
  const policy = sql.slice(sql.indexOf("create policy partnership_enquiries_select_participants"), sql.indexOf("create policy partnership_enquiries_insert_requester"));
  assert.match(policy, /requester_id = \(select auth\.uid\(\)\)/);
  assert.match(policy, /idea_private\.is_partnership_opportunity_owner\(opportunity_id\)/);
});

test("state transitions use invoker trigger guards and immutable identity", () => {
  for (const fn of ["guard_specialist_request_transition","guard_resource_request_transition","guard_partnership_enquiry_transition"]) {
    const start = sql.indexOf("function idea_private." + fn + "()");
    const section = sql.slice(start, sql.indexOf("$function$;", start) + 11);
    assert.match(section, /security invoker/i);
    assert.match(section, /set search_path = ''/i);
    assert.match(section, /auth\.uid\(\)/i);
  }
  assert.equal((executableSql.match(/security definer/gi) || []).length, 3);
});

test("private owner predicates protect restricted columns without exposing them", () => {
  const helpers = [
    ["is_specialist_profile_owner", "specialist_profiles", "user_id"],
    ["is_resource_offer_owner", "resource_offers", "owner_id"],
    ["is_partnership_opportunity_owner", "partnership_opportunities", "owner_id"]
  ];
  for (const [fn, table, column] of helpers) {
    const start = sql.indexOf("create or replace function idea_private." + fn);
    const end = sql.indexOf("$function$;", start) + 11;
    const body = sql.slice(start, end);
    assert.ok(start >= 0, fn + " exists");
    assert.match(body, /security definer/i);
    assert.match(body, /set search_path = ''/i);
    assert.ok(body.includes("from idea_app." + table));
    assert.ok(body.includes(column + " = (select auth.uid())"));
    assert.match(sql, new RegExp("revoke all on function idea_private\\." + fn + "\\(uuid\\) from public, anon, authenticated", "i"));
    assert.match(sql, new RegExp("grant execute on function idea_private\\." + fn + "\\(uuid\\) to authenticated", "i"));
  }
  const policiesAndTriggers = sql.slice(sql.indexOf("create policy specialist_requests_select_participants"));
  assert.doesNotMatch(policiesAndTriggers, /sp\.user_id\s*=\s*\(select auth\.uid\(\)\)/i);
  assert.doesNotMatch(policiesAndTriggers, /ro\.owner_id\s*=\s*\(select auth\.uid\(\)\)/i);
  assert.doesNotMatch(policiesAndTriggers, /po\.owner_id\s*=\s*\(select auth\.uid\(\)\)/i);
  assert.doesNotMatch(policiesAndTriggers, /select (sp\.user_id|ro\.owner_id|po\.owner_id) into/i);
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
  const grantFor = (table, roleSuffix) => {
    const endMarker = `on idea_app.${table} ${roleSuffix};`;
    const end = sql.indexOf(endMarker);
    assert.ok(end >= 0, `grant for ${table} should exist`);
    const start = sql.lastIndexOf("grant select (", end);
    assert.ok(start >= 0, `column SELECT grant for ${table} should exist`);
    return sql.slice(start, end + endMarker.length);
  };

  const specialistGrant = grantFor("specialist_profiles", "to anon, authenticated");
  assert.doesNotMatch(specialistGrant, /\\buser_id\\b/i);

  const resourceGrant = grantFor("resource_offers", "to anon, authenticated");
  assert.doesNotMatch(resourceGrant, /\\bowner_id\\b/i);

  const partnershipGrant = grantFor("partnership_opportunities", "to anon, authenticated");
  assert.doesNotMatch(partnershipGrant, /\\bowner_id\\b/i);
});
test("specialists can provide a response note when accepting or declining", () => {
  const start = sql.indexOf("if v_is_specialist and not v_reviewer");
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
  assert.match(sql, /v_is_specialist := \(select idea_private\.is_specialist_profile_owner\(old\.specialist_id\)\)/i);
});


test("all specialist request participant checks resolve opaque IDs to Auth ownership", () => {
  const updatePolicy = sql.slice(sql.indexOf("create policy specialist_requests_update_participants"), sql.indexOf("-- Resource offers:"));
  assert.equal((updatePolicy.match(/idea_private\.is_specialist_profile_owner\(specialist_id\)/g) || []).length, 2);
  assert.doesNotMatch(updatePolicy, /sp\.user_id|specialist_id = \(select auth\.uid\(\)\)/);
});
