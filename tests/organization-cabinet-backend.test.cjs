"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const migration=fs.readFileSync(path.join(root,"supabase/migrations/20261116183049_organization_cabinet_read_rpcs.sql"),"utf8");
const data=fs.readFileSync(path.join(root,"assets/idea-data.js"),"utf8");
const page=fs.readFileSync(path.join(root,"organizations.html"),"utf8");
const ui=fs.readFileSync(path.join(root,"assets/idea-organizations-server.js"),"utf8");

test("organization read RPCs are SECURITY INVOKER and authenticated-only",()=>{
 for(const name of ["idea_lab_list_my_organizations","idea_lab_list_organization_members"]){
  assert.match(migration,new RegExp("create\\s+or\\s+replace\\s+function\\s+public\\."+name+"\\b","i"));
  assert.match(migration,new RegExp("function\\s+public\\."+name+"[\\s\\S]*?security\\s+invoker","i"));
  assert.match(migration,new RegExp("revoke\\s+all\\s+on\\s+function\\s+public\\."+name+"[\\s\\S]*?from\\s+public,\\s*anon","i"));
  assert.match(migration,new RegExp("grant\\s+execute\\s+on\\s+function\\s+public\\."+name+"[\\s\\S]*?to\\s+authenticated","i"));
 }
 assert.doesNotMatch(migration,/security\\s+definer/i);
});

test("organization data adapter exposes server reads and validated writes",()=>{
 for(const method of ["listMyOrganizations","listOrganizationMembers","createOrganization","updateOrganization","inviteOrganizationMember","acceptOrganizationInvite"])
  assert.match(data,new RegExp("\\b"+method+"\\s*\\("),method+" adapter missing");
 assert.match(data,/runPublicCommand\\("list_my_organizations"/);
 assert.match(data,/runPublicCommand\\("list_organization_members"/);
});

test("organization page loads Auth, data adapter and server cabinet",()=>{
 assert.ok(page.indexOf('src="assets/idea-auth.js"')<page.indexOf('src="assets/idea-data.js"'));
 assert.ok(page.indexOf('src="assets/idea-data.js"')<page.indexOf('src="assets/idea-organizations-server.js"'));
 assert.match(ui,/auth\\.configure\\(window\\.IDEALAB_CONFIG,window\\.supabase\\)/);
 assert.match(ui,/data\\.listMyOrganizations\\(/);
 assert.match(ui,/data\\.createOrganization\\(/);
 assert.match(ui,/data\\.updateOrganization\\(/);
 assert.match(ui,/data\\.inviteOrganizationMember\\(/);
 assert.match(ui,/data\\.listOrganizationMembers\\(/);
 assert.match(ui,/HTTPS bilan boshlanishi kerak/);
 assert.doesNotMatch(ui,/localStorage|IDEALAB\\.store/);
});
