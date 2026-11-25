"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
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
