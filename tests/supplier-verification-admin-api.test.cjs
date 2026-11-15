"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.join(__dirname,"..");
const adminFn=fs.readFileSync(path.join(root,"supabase/functions/supplier-verification-admin/index.ts"),"utf8");
const evidenceFn=fs.readFileSync(path.join(root,"supabase/functions/supplier-verification-evidence/index.ts"),"utf8");
const migration=fs.readFileSync(path.join(root,"supabase/migrations/20261121_supplier_verification_admin_control.sql"),"utf8");

test("admin endpoint requires JWT and active administrator on every request",()=>{
 assert.match(adminFn,/Bearer\s+(.+)/i);
 assert.match(adminFn,/admin\.auth\.getUser\(token\)/i);
 assert.match(adminFn,/from\("supplier_verification_admins"\)/i);
 assert.match(adminFn,/eq\("is_active", true\)/i);
 assert.ok(adminFn.indexOf("Administrator permission required")<adminFn.indexOf('if (body.action === "list_reviewers")'));
});

test("admin API exposes only the documented management actions",()=>{
 for(const action of ["list_reviewers","list_cases","list_assignments","list_history","set_reviewer","assign_case","revoke_case"])assert.ok(adminFn.includes('"'+action+'"'));
 assert.match(adminFn,/getUserById\(reviewerUserId\)/);
 assert.match(adminFn,/admin_assign_supplier_verification_case/);
 assert.match(adminFn,/admin_revoke_supplier_verification_case/);
});

test("admin mutations are audited and reviewer deactivation revokes case assignments",()=>{
 assert.match(migration,/insert into public\.supplier_verification_assignment_events/i);
 assert.match(migration,/if not p_is_active then[\s\S]*update public\.supplier_verification_review_assignments[\s\S]*is_active = false, revoked_at = now\(\)/i);
 assert.match(migration,/coalesce\(nullif\(btrim\(p_note\), ''\), 'Reviewer deaktivatsiya qilindi/i);
});

test("Supabase SDK CORS preflight headers are allowed",()=>{
 for(const fn of [adminFn,evidenceFn]){
  assert.match(fn,/authorization, apikey, content-type, x-client-info/i);
 }
});

test("reviewer evidence signed links are denied without case-level assignment",()=>{
 const block=evidenceFn.slice(evidenceFn.indexOf('if (action === "download_ticket")'));
 assert.match(block,/from\("supplier_verification_review_assignments"\)/);
 assert.match(block,/eq\("application_id", evidence\.application_id\)/);
 assert.match(block,/eq\("reviewer_user_id", actor\.id\)/);
 assert.ok(block.indexOf("if (!isOwner && !isAssignedReviewer)")<block.indexOf("createSignedUrl"));
});

test("case assignment only targets open cases and serializes reviewer deactivation",()=>{
 assert.match(migration,/Only open verification cases can be assigned/i);
 assert.match(migration,/from public\.supplier_verification_reviewers r[\s\S]*for update/i);
 const assignmentMigration=fs.readFileSync(path.join(root,"supabase/migrations/20261120_supplier_verification_case_assignments.sql"),"utf8");
 assert.match(assignmentMigration,/from public\.supplier_verification_reviewers r[\s\S]*for share/i);
 assert.match(assignmentMigration,/from public\.supplier_verification_review_assignments a[\s\S]*for update/i);
});
