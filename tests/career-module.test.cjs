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

test("vacancies with an existing application cannot be applied to again", () => {
  assert.match(server, /appliedJobIds=new Set\(\)/);
  assert.match(server, /appliedJobIds\.has\(job\.id\)/);
  assert.match(server, /apply\.disabled=alreadyApplied/);
  assert.match(server, /appliedJobIds=new Set\(\(Array\.isArray\(r\.data\)\?r\.data:\[\]\)\.map\(item=>item\.job_post_id\)/);
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

const applicationTransitions = read("supabase/migrations/20261126171000_idea_app_job_application_status_transitions.sql");

test("job application status transitions are one-way and participant-authorized", () => {
  assert.match(applicationTransitions, /old\.status\s*<>\s*'submitted'/i);
  assert.match(applicationTransitions, /v_actor\s*=\s*old\.applicant_id\s+and\s+new\.status\s*=\s*'withdrawn'/i);
  assert.match(applicationTransitions, /v_actor\s*=\s*v_owner\s+and\s+new\.status\s+in\s*\('accepted',\s*'declined'\)/i);
  assert.match(applicationTransitions, /before update of status on idea_app\.job_applications/i);
  assert.match(applicationTransitions, /security definer/i);
});

const withdrawnApplicationAccessMigration = read("supabase/migrations/20261126172000_idea_app_withdrawn_application_visibility.sql");

test("withdrawn applications and their private message are hidden from employers by RLS", () => {
  assert.match(withdrawnApplicationAccessMigration, /drop policy if exists job_applications_select_participant/i);
  assert.match(withdrawnApplicationAccessMigration, /create policy job_applications_select_participant/i);
  assert.match(withdrawnApplicationAccessMigration, /applicant_id\s*=\s*\(select auth\.uid\(\)\)/i);
  assert.match(withdrawnApplicationAccessMigration, /status\s*<>\s*'withdrawn'/i);
  assert.match(withdrawnApplicationAccessMigration, /j\.created_by\s*=\s*\(select auth\.uid\(\)\)/i);
});

test("application notifications are visible in both seeker and employer modes", () => {
  assert.match(server, /myActivity\.dataset\.careerFlow="both"/);
  assert.match(server, /node\.dataset\.careerFlow!=="both"&&node\.dataset\.careerFlow!==active/);
  assert.match(server, /loadMyActivity\(\)/);
});

const ownerEditMigration = read("supabase/migrations/20261127010000_idea_app_owner_edit_job_post.sql");

test("owner vacancy edit RPC validates fields, scopes by creator and requeues published edits for review", () => {
  assert.match(ownerEditMigration, /security invoker/i);
  assert.match(ownerEditMigration, /where id=p_job_post_id and created_by=auth\.uid\(\)/i);
  assert.match(ownerEditMigration, /status=case when status='published' then 'pending_review'/i);
  assert.match(ownerEditMigration, /revoke all on function public\.idea_lab_update_job_post/i);
  assert.match(ownerEditMigration, /grant execute on function public\.idea_lab_update_job_post.*to authenticated/i);
  assert.match(data, /updateJobPost\(jobPostId, input\)/);
  assert.match(data, /idea_lab_update_job_post/);
});

test("employer dashboard exposes a prefilled vacancy editor and validated save flow", () => {
  assert.match(server, /const editPanel=document\.createElement\("section"\)/);
  assert.match(server, /function openJobEditor\(job\)/);
  assert.match(server, /ilEditTitle.*job\.title/);
  assert.match(server, /data\.updateJobPost\(editingJobId,input\)/);
  assert.match(server, /ilJobEditCancel/);
  assert.match(server, /textContent="Tahrirlash"/);
});

test("employer dashboard shows vacancy and application analytics", () => {
  assert.match(server, /Ish beruvchi statistikasi/);
  assert.match(server, /listJobPostApplications\(job\.job_post_id\)/);
  assert.match(server, /ownedJobs\.filter\(job=>\["published","closed"\]\.includes\(job\.status\)\)\.map\(job=>data\.listJobPostApplications\(job\.job_post_id\)\)/);
  assert.match(server, /Ko‘rinadigan arizalar/);
  assert.match(server, /statsData\.accepted\+\+/);
});
test("employer application decisions show inline accessible feedback and recover on errors", () => {
  assert.match(server, /feedback\.setAttribute\("role","status"\)/);
  assert.match(server, /feedback\.setAttribute\("aria-live","polite"\)/);
  assert.match(server, /Qaror saqlandi\. Arizalar ro‘yxati yangilanmoqda/);
  assert.match(server, /Qarorni saqlashda xatolik yuz berdi/);
  assert.match(server, /aria-label",label\+" — "\+\(item\.candidate_name\|\|"nomzod"\)/);
});
test("vacancy edit includes schedule, experience and required skills", () => {
  assert.match(server, /ilEditSchedule/);
  assert.match(server, /ilEditExperience/);
  assert.match(server, /ilEditSkills/);
  assert.match(server, /requiredSkills:clean\(\$\("ilEditSkills"\)\.value\)\.split\(","\)/);
  assert.match(data, /p_required_skills: input\.requiredSkills\.map/);
  assert.match(data, /p_experience_years_min: input\.experienceYearsMin/);
  assert.match(data, /p_schedule_label: input\.scheduleLabel\.trim\(\)/);
  assert.match(ownerEditMigration, /required_skills=coalesce\(p_required_skills,'\{\}'\)/);
  assert.match(ownerEditMigration, /experience_years_min=coalesce\(p_experience_years_min,0\)/);
  assert.match(ownerEditMigration, /schedule_label=coalesce\(btrim\(p_schedule_label\),''\)/);
});


test("employer application panel supports candidate search and status filtering with live counts", () => {
  assert.match(server, /career-application-tools/);
  assert.match(server, /Nomzod, ko‘nikma yoki shahar bo‘yicha qidirish/);
  assert.match(server, /Ariza holati bo‘yicha filtrlash/);
  assert.match(server, /visible\.length\+" ta ariza ko‘rsatilmoqda/);
  assert.match(server, /item\.candidate_name,item\.candidate_city,item\.candidate_experience_summary/);
  assert.match(server, /search\.addEventListener\("input",render\)/);
  assert.match(server, /filter\.addEventListener\("change",render\)/);
});


test("employer applications can be sorted by newest, oldest and candidate name", () => {
  assert.match(server, /Arizalarni saralash/);
  assert.match(server, /\[\["newest","Eng yangi"\],\["oldest","Eng eski"\],\["name","Ism bo‘yicha"\]\]/);
  assert.match(server, /visible\.sort\(\(x,y\)=>new Date\(y\.submitted_at\)-new Date\(x\.submitted_at\)\)/);
  assert.match(server, /visible\.sort\(\(x,y\)=>new Date\(x\.submitted_at\)-new Date\(y\.submitted_at\)\)/);
  assert.match(server, /clean\(x\.candidate_name\)\.localeCompare\(clean\(y\.candidate_name\),"uz"\)/);
  assert.match(server, /sort\.addEventListener\("change",render\)/);
});

test("employer vacancy dashboard supports search and lifecycle status filters", () => {
  assert.match(server, /Mening vakansiyalarimdan qidirish/);
  assert.match(server, /Vakansiya holati bo‘yicha filtrlash/);
  assert.match(server, /\[\["","Barcha holatlar"\],\["published","Ochiq"\],\["pending_review","Tekshiruvda"\],\["closed","Yopilgan"\],\["rejected","Rad etilgan"\]\]/);
  assert.match(server, /updateOwnedVisibility\(\)/);
  assert.match(server, /search\.addEventListener\("input",updateOwnedVisibility\)/);
  assert.match(server, /filter\.addEventListener\("change",updateOwnedVisibility\)/);
  assert.match(server, /Bu e’lon yopilgan va ommaviy katalogda ko‘rinmaydi/);
  assert.match(server, /Qayta ochish moderator tekshiruvini talab qiladi/);
});

const vacancyModerationReasonsMigration = read("supabase/migrations/20261127020000_idea_app_vacancy_moderation_reasons.sql");

test("moderator rejection reasons are validated, persisted and returned only through the owner vacancy list", () => {
  assert.match(vacancyModerationReasonsMigration, /add column if not exists moderation_reason text/i);
  assert.match(vacancyModerationReasonsMigration, /security invoker/i);
  assert.match(vacancyModerationReasonsMigration, /not p_approve and \(v_reason is null or char_length\(v_reason\) not between 10 and 500\)/i);
  assert.match(vacancyModerationReasonsMigration, /moderation_reason=case when p_approve then null else v_reason end/i);
  assert.match(vacancyModerationReasonsMigration, /where j\.created_by=\(select auth\.uid\(\)\)/i);
  assert.match(vacancyModerationReasonsMigration, /j\.moderation_reason/i);
  assert.match(vacancyModerationReasonsMigration, /grant execute on function public\.idea_lab_review_job_post\(uuid,boolean,text\) to authenticated/i);
});

test("moderator UI requires a clear rejection reason and displays it in the employer cabinet", () => {
  assert.match(server, /Rad etish sababi \(majburiy, 10–500 belgi\)/);
  assert.match(server, /Rad etish sababi kamida 10 va ko‘pi bilan 500 belgidan iborat bo‘lsin/);
  assert.match(server, /data\.reviewJobPost\(job\.job_post_id,false,text\)/);
  assert.match(server, /job\\.moderation_reason\\?"Moderator izohi: "\\+job\\.moderation_reason/);
  assert.match(data, /reviewJobPost\(jobPostId, approve, reason = ""\)/);
  assert.match(data, /p_reason: approve \? null : cleanReason/);
});
