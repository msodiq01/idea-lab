"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const page = read("teams.html");
const careerPage = read("career.html");
const data = read("assets/idea-data.js");
const teams = read("assets/idea-teams-server.js");
const careers = read("assets/idea-careers-server.js");
const teamMigration = read("supabase/migrations/20261117051020_idea_app_team_membership_requests.sql");
const careerMigration = read("supabase/migrations/20261117051526_idea_app_career_center.sql");
const careerGuard = read("supabase/migrations/20261117051708_idea_app_job_organization_publish_guard.sql");
const careerGrants = read("supabase/migrations/20261117051855_idea_app_job_column_grants.sql");

function scriptSources(html) {
  return Array.from(html.matchAll(/<script[^>]*src=["']([^"']+)["'][^>]*>/g), match => match[1]);
}

test("teams and career server modules load after shared auth and data adapters", () => {
  const scripts = scriptSources(page);
  for (const name of ["assets/idea-auth.js", "assets/idea-data.js", "assets/idea-teams-server.js", "assets/idea-careers-server.js"]) {
    assert.ok(scripts.includes(name), name + " must be loaded");
  }
  assert.ok(scripts.indexOf("assets/idea-data.js") < scripts.indexOf("assets/idea-teams-server.js"));
  assert.ok(scripts.indexOf("assets/idea-data.js") < scripts.indexOf("assets/idea-careers-server.js"));
});

test("team directory, creation and membership actions use the server data gateway", () => {
  for (const method of ["listPublicTeams", "createOrganization", "updateOrganization", "requestTeamMembership", "listMyTeamMemberships", "listMyOrganizations", "listOrganizationMembers", "reviewTeamMembership"]) {
    assert.match(teams, new RegExp("data\\." + method + "\\("), method);
    assert.match(data, new RegExp(method + "\\s*\\("), method + " adapter");
  }
  assert.doesNotMatch(teams, /localStorage|IDEALAB\.legacy/);
});

test("team membership requests and owner decisions are authenticated invoker RPCs", () => {
  for (const rpc of ["idea_lab_request_team_membership", "idea_lab_list_my_team_memberships", "idea_lab_review_team_membership"]) {
    assert.ok(teamMigration.includes(rpc), rpc);
  }
  assert.match(teamMigration, /security invoker/i);
  assert.match(teamMigration, /revoke all on function[\s\S]*from public, anon/i);
  assert.match(teamMigration, /grant execute on function[\s\S]*to authenticated/i);
  assert.match(teamMigration, /user_id = \(select auth\.uid\(\)\)/i);
  assert.match(teamMigration, /o\.owner_id = auth\.uid\(\)/i);
});

test("team page removes private contact inputs and hides legacy local application panels", () => {
  assert.match(teams, /fieldPhone[\s\S]*?fieldPhone\.remove\(\)/);
  assert.match(teams, /fieldTelegram[\s\S]*?fieldTelegram\.remove\(\)/);
  assert.match(teams, /legacyMyApplications\) legacyMyApplications\.hidden = true/);
  assert.match(teams, /legacyTeamManager\) legacyTeamManager\.hidden = true/);
});

test("public vacancy directory and vacancy application flows use server adapters", () => {
  for (const method of ["listPublicJobPosts", "createJobPost", "listMyJobPosts", "updateJobPostStatus", "applyJobPost", "listMyJobApplications", "listJobPostApplications", "reviewJobApplication"]) {
    assert.match(careers, new RegExp("data\\." + method + "\\("), method);
    assert.match(data, new RegExp(method + "\\s*\\("), method + " adapter");
  }
  assert.doesNotMatch(careers, /localStorage|IDEALAB\.legacy/);
});

test("vacancy UI disables legacy employer application panel and protects contact details", () => {
  assert.match(careers, /legacyEmployerPanel\)legacyEmployerPanel\.hidden=true/);
  assert.match(careers, /ish telefoni hammaga ko‘rinadi/);
  assert.match(careers, /shaxsiy raqamingizni kiritmang/);
  assert.match(careers, /auth\.html\?next=career\.html/);
  const careerScripts = scriptSources(careerPage);
  assert.ok(careerScripts.includes("assets/idea-auth.js"));
  assert.ok(careerScripts.includes("assets/idea-data.js"));
  assert.ok(careerScripts.includes("assets/idea-careers-server.js"));
  assert.match(careerPage, /id="modeSeeker"/);
  assert.match(careerPage, /id="modeEmployer"/);
});

test("career migration creates private applications with participant-scoped RLS", () => {
  assert.match(careerMigration, /create table if not exists idea_app\.job_posts/i);
  assert.match(careerMigration, /create table if not exists idea_app\.job_applications/i);
  assert.match(careerMigration, /alter table idea_app\.job_posts enable row level security/i);
  assert.match(careerMigration, /alter table idea_app\.job_applications enable row level security/i);
  assert.match(careerMigration, /applicant_id=\(select auth\.uid\(\)\) or exists/i);
  assert.match(careerMigration, /security_invoker=true/i);
});

test("vacancy publishing is restricted to the owner's active public non-team organization", () => {
  assert.match(careerGuard, /o\.owner_id=auth\.uid\(\)/i);
  assert.match(careerGuard, /o\.visibility='public'/i);
  assert.match(careerGuard, /o\.status='active'/i);
  assert.match(careerGuard, /o\.organization_type<>'team'/i);
});

test("vacancy table grants restrict public and client access to approved columns", () => {
  assert.match(careerGrants, /revoke select on idea_app\.job_posts from anon,authenticated/i);
  assert.match(careerGrants, /grant select\(id,organization_id,title,description,salary_label,location_label,employment_type,published_at,status\)\s+on idea_app\.job_posts to anon/i);
  assert.match(careerGrants, /grant insert\(job_post_id,applicant_id,message\) on idea_app\.job_applications to authenticated/i);
});

test("data adapter validates job and membership identifiers before RPC calls", () => {
  assert.match(data, /requestTeamMembership\(organizationId\)[\s\S]*?if \(!isUuid\(organizationId\)\)/);
  assert.match(data, /createJobPost\(input = \{\}\)[\s\S]*?if \(!isUuid\(input\.organizationId\)/);
  assert.match(data, /applyJobPost\(jobPostId, message\)[\s\S]*?if \(!isUuid\(jobPostId\)/);
  assert.match(data, /reviewJobApplication\(applicationId, status\)[\s\S]*?!\["interview", "accepted", "declined"\]\.includes\(status\)/);
});
