"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const core = fs.readFileSync(path.join(__dirname, "..", "assets", "idea-core.js"), "utf8");

test("Core application status model contains the full lifecycle",()=>{
 for(const key of ["submitted","reviewing","interview","accepted","negotiating","agreed","in_progress","completed","rejected","withdrawn","cancelled"]) assert.ok(core.includes(key));
 assert.match(core,/normalizeApplicationStatus/);
 assert.match(core,/applicationStatusLabel/);
 assert.match(core,/nextApplicationStatuses/);
});

test("Legacy Uzbek labels map into canonical application statuses",()=>{
 for(const mapping of [
  '"yangi":"submitted"','"ko‘rib chiqilmoqda":"reviewing"','"suhbat belgilandi":"interview"',
  '"qabul qilindi":"accepted"','"muzokara":"negotiating"','"kelishildi":"agreed"',
  '"jarayonda":"in_progress"','"yakunlandi":"completed"','"rad etildi":"rejected"',
  '"bekor qilindi":"withdrawn"'
 ]) assert.ok(core.includes(mapping),"Missing mapping: "+mapping);
});

test("Lifecycle marks final states terminal and separates applicant withdrawal",()=>{
 assert.match(core,/completed: Object\.freeze\(\[\]\)/);
 assert.match(core,/rejected: Object\.freeze\(\[\]\)/);
 assert.match(core,/withdrawn: Object\.freeze\(\[\]\)/);
 assert.match(core,/actor === "applicant"/);
});


test("Investor and team application controls use the shared canonical lifecycle",()=>{
 const investors=fs.readFileSync(path.join(__dirname,"..","investors.html"),"utf8");
 const teams=fs.readFileSync(path.join(__dirname,"..","teams.html"),"utf8");
 for(const html of [investors,teams]){
  assert.match(html,/ideaCore\.applications\.normalizeStatus/);
  assert.match(html,/ideaCore\.applications\.statusLabel/);
  assert.match(html,/ideaCore\.applications\.nextStatuses\([^)]*,\s*"owner"\)/);
  assert.match(html,/Bu holatga o‘tish ruxsat etilmagan/);
  assert.match(html,/value="interview"/);
  assert.match(html,/value="negotiating"/);
 }
});


test("Offer applications use the shared lifecycle for owners and applicants",()=>{
 const offers=fs.readFileSync(path.join(__dirname,"..","offers.html"),"utf8");
 assert.match(offers,/status: "submitted"/);
 assert.match(offers,/ideaCore\.applications\.normalizeStatus/);
 assert.match(offers,/ideaCore\.applications\.statusLabel/);
 assert.match(offers,/ideaCore\.applications\.nextStatuses\(currentStatus, actor\)/);
 assert.match(offers,/Arizani qaytarib olish/);
 assert.match(offers,/Bu holatga o‘tish ruxsat etilmagan/);
 assert.match(offers,/applications\[index\]\.status = nextStatus/);
});
