"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const migration = fs.readFileSync(
  path.join(root, "supabase/migrations/20261128140000_idea_app_unified_application_center_jobs.sql"),
  "utf8"
);
const page = fs.readFileSync(path.join(root, "applications.html"), "utf8");

test("unified application view adds career applications without replacing existing domains", () => {
  assert.match(migration, /create or replace view public\.application_center/i);
  for (const source of ["idea_app.applications", "idea_app.resource_requests", "idea_app.partnership_enquiries", "idea_app.specialist_requests", "idea_app.job_applications"]) {
    assert.ok(migration.includes(source), source + " must remain in the unified feed");
  }
  assert.match(migration, /'job'::text/);
});

test("career application rows are participant-filtered through the invoker view and existing RLS", () => {
  assert.match(migration, /with \(security_invoker = true\)/i);
  assert.match(migration, /a\.applicant_id = \(select auth\.uid\(\)\).*'outgoing' else 'incoming'/s);
  assert.match(migration, /join idea_app\.job_posts j on j\.id = a\.job_post_id/i);
  const executableSql = migration.replace(/--.*$/gm, "");
  assert.doesNotMatch(executableSql, /service_role|security definer|phone|email|resume_path|storage_path/i);
  assert.match(migration, /grant select on public\.application_center to authenticated/i);
});

test("Applications Center recognizes career applications and their status labels", () => {
  assert.match(page, /job:"Ishga ariza"/);
  assert.match(page, /job:"job"/);
  assert.match(page, /row\.status==="declined"\?"rejected"/);
  assert.match(page, /r\.item\.message\?"Xabar: "/);
});
