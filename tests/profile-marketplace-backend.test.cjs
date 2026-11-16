"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.join(__dirname,"..");
const migration=fs.readFileSync(path.join(root,"supabase/migrations/20261116182243_profile_organization_marketplace_invoker_rpcs.sql"),"utf8");
const data=fs.readFileSync(path.join(root,"assets/idea-data.js"),"utf8");
const profile=fs.readFileSync(path.join(root,"profile.html"),"utf8");
const specialists=fs.readFileSync(path.join(root,"specialists.html"),"utf8");

const rpcNames=[
 "idea_lab_upsert_profile","idea_lab_upsert_specialist_profile",
 "idea_lab_create_organization","idea_lab_update_organization",
 "idea_lab_invite_organization_member","idea_lab_accept_organization_invite",
 "idea_lab_create_resource_offer","idea_lab_update_resource_offer",
 "idea_lab_create_partnership_opportunity","idea_lab_update_partnership_opportunity",
 "idea_lab_submit_resource_request","idea_lab_submit_partnership_enquiry"
];

test("profile and marketplace RPC migration defines only invoker functions",()=>{
 for(const name of rpcNames){
  assert.match(migration,new RegExp("create\\s+or\\s+replace\\s+function\\s+public\\."+name+"\\b","i"),name+" must exist");
  assert.match(migration,new RegExp("function\\s+public\\."+name+"[\\s\\S]*?security\\s+invoker","i"),name+" must be SECURITY INVOKER");
  assert.match(migration,new RegExp("grant\\s+execute\\s+on\\s+function\\s+public\\."+name,"i"),name+" must be granted");
  assert.match(migration,new RegExp("revoke\\s+all\\s+on\\s+function\\s+public\\."+name+"[\\s\\S]*?from\\s+public,\\s*anon","i"),name+" must not be public or anonymous");
 }
 assert.doesNotMatch(migration,/security\\s+definer/i);
});

test("frontend data adapter exposes validated profile and marketplace commands",()=>{
 for(const method of ["upsertProfile","upsertSpecialistProfile","createOrganization","updateOrganization","inviteOrganizationMember","acceptOrganizationInvite","createResourceOffer","updateResourceOffer","createPartnershipOpportunity","updatePartnershipOpportunity","submitResourceRequest","submitPartnershipEnquiry"]){
  assert.match(data,new RegExp("\\b"+method+"\\s*\\("),method+" adapter missing");
 }
 assert.match(data,/runPublicCommand\("idea_lab_upsert_profile"/);
 assert.match(data,/runPublicCommand\("idea_lab_upsert_specialist_profile"/);
});

test("profile page loads data adapter after Auth and persists structured profile after explicit sync",()=>{
 assert.ok(profile.indexOf('src="assets/idea-data.js"')>profile.indexOf('src="assets/idea-auth.js"'));
 assert.match(profile,/dataAdapter\.upsertProfile\(/);
 assert.match(profile,/window\.confirm\("Ushbu brauzerdagi eski profil ma’lumotlarini/);
});

test("specialist page uses public server directory and authenticated upsert without publishing email or phone",()=>{
 assert.match(specialists,/data\.listPublicSpecialists\(/);
 assert.match(specialists,/data\.upsertSpecialistProfile\(/);
 assert.match(specialists,/visibility:"public"/);
 assert.match(specialists,/Email va telefon katalogga joylanmadi/);
});
