"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const root=path.join(__dirname,"..");
const sql=fs.readFileSync(path.join(root,"supabase/migrations/20261121_supplier_verification_admin_control.sql"),"utf8");
const adminFn=fs.readFileSync(path.join(root,"supabase/functions/supplier-verification-admin/index.ts"),"utf8");
const evidenceFn=fs.readFileSync(path.join(root,"supabase/functions/supplier-verification-evidence/index.ts"),"utf8");
const page=fs.readFileSync(path.join(root,"supplier-verification-admin.html"),"utf8");
const shell=fs.readFileSync(path.join(root,"assets/idea-shell.js"),"utf8");

test("admin allowlist and audit history are not client-readable or writable",()=>{
 assert.match(sql,/create table if not exists public\.supplier_verification_admins/i);
 assert.match(sql,/create table if not exists public\.supplier_verification_assignment_events/i);
 assert.match(sql,/revoke all on public\.supplier_verification_admins from public, anon, authenticated/i);
 assert.match(sql,/revoke all on public\.supplier_verification_assignment_events from public, anon, authenticated/i);
 assert.match(sql,/grant all on public\.supplier_verification_admins to service_role/i);
});

test("admin mutation RPCs verify allowlist and are service-role only",()=>{
 for(const fn of ["admin_set_supplier_verification_reviewer","admin_assign_supplier_verification_case","admin_revoke_supplier_verification_case"]){
  assert.match(sql,new RegExp("create or replace function public\\."+fn,"i"));
  assert.match(sql,new RegExp("public\\.supplier_verification_admins[\\s\\S]*p_actor_user_id[\\s\\S]*is_active = true","i"));
  assert.match(sql,new RegExp("grant execute on function public\\."+fn+"[\\s\\S]*to service_role","i"));
 }
 assert.doesNotMatch(sql,/grant execute on function public\.admin_[^;]+to authenticated/i);
});

test("reviewer deactivation revokes active assignments and records events",()=>{
 assert.match(sql,/if not p_is_active then[\s\S]*update public\.supplier_verification_review_assignments[\s\S]*is_active = false, revoked_at = now\(\)/i);
 assert.match(sql,/'case_assignment_revoked'/i);
});

test("admin Edge Function authenticates JWT and checks admin allowlist before actions",()=>{
 assert.match(adminFn,/admin\.auth\.getUser\(token\)/i);
 assert.match(adminFn,/from\("supplier_verification_admins"\)/i);
 assert.match(adminFn,/eq\("is_active", true\)/i);
 for(const action of ["list_reviewers","list_cases","list_assignments","list_history","set_reviewer","assign_case","revoke_case"])assert.ok(adminFn.includes('"'+action+'"'));
 assert.doesNotMatch(adminFn,/SUPABASE_SERVICE_ROLE_KEY\s*=\s*["']/);
});

test("evidence signed URL requires active reviewer and matching case assignment",()=>{
 const block=evidenceFn.slice(evidenceFn.indexOf('if (action === "download_ticket")'));
 assert.match(block,/from\("supplier_verification_review_assignments"\)/i);
 assert.match(block,/eq\("application_id", evidence\.application_id\)/i);
 assert.match(block,/eq\("reviewer_user_id", actor\.id\)/i);
 assert.match(block,/from\("supplier_verification_reviewers"\)/i);
 assert.ok(block.indexOf("isAssignedReviewer")<block.indexOf("createSignedUrl"));
});

test("admin UI is locked without Supabase config and uses Edge Function actions",()=>{
 assert.match(page,/class="locked"/);
 assert.match(page,/workspace\.classList\.remove\("locked"\)/);
 assert.match(page,/functions\.invoke\("supplier-verification-admin"/);
 assert.match(page,/IDEALAB_CONFIG/);
 assert.match(shell,/Tekshiruv boshqaruvi","supplier-verification-admin\.html/);
 assert.match(page,/Biriktirishni bekor qilish/);
});

test("admin controls unlock only after server-side allowlist check",()=>{
 assert.ok(page.indexOf('await invoke("list_reviewers")')<page.indexOf('workspace.classList.remove("locked")'));
 assert.doesNotMatch(page,/SUPABASE_SERVICE_ROLE_KEY/);
});
