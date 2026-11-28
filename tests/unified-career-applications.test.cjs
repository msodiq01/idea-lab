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

test("unified center routes incoming career decisions to the protected review RPC", () => {
  assert.match(page, /IDEALAB_DATA\.reviewJobApplication\(r\.id,next==="rejected"\?"declined":next\)/);
  assert.match(page, /if\(r\.source\.type==="job"\)return r\.status==="submitted"\?\["interview","accepted","rejected"\]/);
  assert.match(page, /if\(r\.source\.type==="job"\)/);
});

test("unified center lets applicants withdraw only submitted career applications", () => {
  assert.match(page, /IDEALAB_DATA\.withdrawJobApplication\(r\.id\)/);
  assert.match(page, /if\(r\.source\.type==="job"\)return r\.status==="submitted"\?\["withdrawn"\]/);
});

test("market request review RPCs enforce explicit participant ownership and allowed statuses", () => {
  const sql = fs.readFileSync(path.join(root, "supabase/migrations/20261128150000_idea_app_marketplace_application_review_rpcs.sql"), "utf8");
  assert.match(sql, /security definer/ig);
  assert.match(sql, /r\.requester_id = auth\.uid\(\)/);
  assert.match(sql, /o\.owner_id = auth\.uid\(\)/);
  assert.match(sql, /e\.requester_id = auth\.uid\(\)/);
  assert.match(sql, /p\.user_id = auth\.uid\(\)/);
  assert.match(sql, /revoke all on function public\.idea_lab_review_resource_request/i);
  assert.doesNotMatch(sql.replace(/--.*$/gm, ""), /grant update on/i);
});

test("unified center calls the dedicated server RPCs for resource, partnership, and specialist decisions", () => {
  assert.match(page, /IDEALAB_DATA\.reviewResourceRequest\(r\.id,next\)/);
  assert.match(page, /IDEALAB_DATA\.reviewPartnershipEnquiry\(r\.id/);
  assert.match(page, /IDEALAB_DATA\.reviewSpecialistRequest\(r\.id/);
  assert.match(page, /function serverActions\(r\)/);
});

test("market review RPCs are executable only by authenticated users", () => {
  const sql = fs.readFileSync(path.join(root, "supabase/migrations/20261128151000_restrict_market_review_rpc_execute.sql"), "utf8");
  for (const name of ["resource_request", "partnership_enquiry", "specialist_request"]) {
    assert.match(sql, new RegExp("revoke all on function public\\\\.idea_lab_review_" + name + "\\\\(uuid,text\\\\) from public, anon, service_role", "i"));
    assert.match(sql, new RegExp("grant execute on function public\\\\.idea_lab_review_" + name + "\\\\(uuid,text\\\\) to authenticated", "i"));
  }
});
