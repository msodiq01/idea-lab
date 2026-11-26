"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");

const page = read("career.html");
const server = read("assets/idea-careers-server.js");
const data = read("assets/idea-data.js");
const resumeMigration = read("supabase/migrations/20261125180000_idea_app_job_seeker_profiles.sql");
const employerGate = read("supabase/migrations/20261125190000_idea_app_employer_verification_gate.sql");
const employerModeration = read("supabase/migrations/20261125200000_idea_app_employer_moderation.sql");
const jobModeration = read("supabase/migrations/20261125230000_idea_app_job_vacancy_moderation.sql");
const activityMigration = read("supabase/migrations/20261125220000_idea_app_job_application_notifications.sql");
const candidateAccess = read("supabase/migrations/20261125240000_idea_app_candidate_resume_access.sql");

function scriptSources(html) {
  return Array.from(html.matchAll(/<script[^>]*src=["']([^"']+)["'][^>]*>/g), match => match[1]);
}


test("all local JavaScript assets loaded by career page parse without syntax errors", () => {
  const localScripts = scriptSources(page).filter(source => source.startsWith("assets/") && source.endsWith(".js"));
  assert.ok(localScripts.length > 0, "career page must load local JavaScript modules");
  for (const source of localScripts) {
    assert.doesNotThrow(() => new vm.Script(read(source)), source + " must parse");
  }
});

test("career route loads shared auth, data and career server modules in order", () => {
  const scripts = scriptSources(page);
  for (const item of ["assets/idea-auth.js", "assets/idea-data.js", "assets/idea-careers-server.js"]) {
    assert.ok(scripts.includes(item), item);
  }
  assert.ok(scripts.indexOf("assets/idea-data.js") < scripts.indexOf("assets/idea-careers-server.js"));
});

test("seeker and employer flows are distinct and resume matching is present", () => {
  assert.match(page, /id="modeSeeker"/);
  assert.match(page, /id="modeEmployer"/);
  assert.match(page, /id="jobSeekerResumeForm"/);
  assert.match(page, /id="matchingJobs"/);
  assert.match(server, /setCareerMode\("seeker"\)/);
  assert.match(server, /setCareerMode\("employer"\)/);
  for (const method of ["getMyJobSeekerProfile", "upsertJobSeekerProfile", "listMatchingJobs"]) {
    assert.match(data, new RegExp(method + "\\s*\\("));
  }
});

test("resume data is private and matching uses published vacancies only", () => {
  assert.match(resumeMigration, /alter table idea_app\.job_seeker_profiles enable row level security/i);
  assert.match(resumeMigration, /user_id = \(select auth\.uid\(\)\)/i);
  assert.match(resumeMigration, /security invoker/i);
  assert.match(resumeMigration, /idea_lab_public_job_directory/i);
});

test("employers cannot self-activate organizations or publish vacancies", () => {
  assert.match(employerGate, /pending_review/i);
  assert.match(employerGate, /already verified public organization/i);
  assert.match(employerModeration, /idea_lab_review_organization/i);
  assert.match(jobModeration, /guard_job_publication/i);
  assert.match(jobModeration, /Vacancy publication requires moderator approval/i);
  assert.match(jobModeration, /idea_lab_review_job_post/i);
});

test("job applications create private notifications for participants", () => {
  assert.match(activityMigration, /alter table idea_app\.job_application_activity enable row level security/i);
  assert.match(activityMigration, /recipient_id=\(select auth\.uid\(\)\)/i);
  assert.match(activityMigration, /security definer/i);
  assert.match(data, /listMyJobActivity\s*\(/);
  assert.match(data, /markJobActivityRead\s*\(/);
});

test("candidate resumes are visible to employers only after application", () => {
  assert.match(candidateAccess, /job_seeker_profiles_applied_employer_read/i);
  assert.match(candidateAccess, /a\.applicant_id=job_seeker_profiles\.user_id/i);
  assert.match(candidateAccess, /j\.created_by=\(select auth\.uid\(\)\)/i);
  assert.match(server, /candidate_experience_summary/);
});

const closedJobAccessMigration = read("supabase/migrations/20261126160000_idea_app_closed_job_read_applicants_only.sql");

test("closed vacancies are visible only to applicants, owners and moderators", () => {
  assert.match(closedJobAccessMigration, /status\s*=\s*'closed'/i);
  assert.match(closedJobAccessMigration, /a\.job_post_id\s*=\s*job_posts\.id/i);
  assert.match(closedJobAccessMigration, /a\.applicant_id\s*=\s*\(select auth\.uid\(\)\)/i);
  assert.match(closedJobAccessMigration, /drop policy if exists job_posts_select_closed_for_authenticated/i);
});

test("async employer, resume and vacancy form handlers await actions and recover from errors", () => {
  assert.match(server, /try\s*\{\s*await createEmployerOrganization\(event\);\s*\}\s*catch/);
  assert.match(server, /try\s*\{\s*await saveResume\(event\);\s*\}\s*catch/);
  assert.match(server, /try\s*\{\s*await createJob\(event\);\s*\}\s*catch/);
  assert.match(server, /resumeSaveStatus.*Rezyumeni saqlashda xatolik/s);
});

const careerIndexMigration = read("supabase/migrations/20261126161000_idea_app_career_foreign_key_indexes.sql");

test("career foreign keys have covering indexes", () => {
  assert.match(careerIndexMigration, /job_posts_organization_idx/i);
  assert.match(careerIndexMigration, /job_application_activity_application_idx/i);
  assert.match(careerIndexMigration, /job_application_activity_actor_idx/i);
  assert.match(careerIndexMigration, /create index if not exists/i);
});

test("homepage and career page contain no duplicate IDs or broken local anchors", () => {
  for (const [name, html] of [["index.html", read("index.html")], ["career.html", page]]) {
    const ids = [...html.matchAll(/\\bid=["']([^"']+)["']/g)].map(match => match[1]);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    assert.deepEqual([...new Set(duplicates)], [], name + " must not contain duplicate IDs");
    const anchors = [...html.matchAll(/\\bhref=["']#([^"']+)["']/g)].map(match => match[1]);
    const missing = [...new Set(anchors.filter(anchor => !ids.includes(anchor)))];
    assert.deepEqual(missing, [], name + " must not contain broken local anchors");
  }
});

const withdrawnResumeAccessMigration = read("supabase/migrations/20261126170000_idea_app_withdrawn_resume_access.sql");

test("candidate resume access ends when the candidate withdraws an application", () => {
  assert.match(withdrawnResumeAccessMigration, /drop policy if exists job_seeker_profiles_applied_employer_read/i);
  assert.match(withdrawnResumeAccessMigration, /create policy job_seeker_profiles_applied_employer_read/i);
  assert.match(withdrawnResumeAccessMigration, /a\.status\s*<>\s*'withdrawn'/i);
  assert.match(withdrawnResumeAccessMigration, /a\.applicant_id=job_seeker_profiles\.user_id/i);
  assert.match(withdrawnResumeAccessMigration, /j\.created_by=\(select auth\.uid\(\)\)/i);
});
