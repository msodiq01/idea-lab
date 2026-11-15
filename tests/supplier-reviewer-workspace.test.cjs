"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const page=fs.readFileSync(path.join(root,"supplier-reviewer.html"),"utf8");
const shell=fs.readFileSync(path.join(root,"assets","idea-shell.js"),"utf8");
test("reviewer workspace uses only clearly synthetic demo cases",()=>{
 assert.match(page,/DEMO-2026-001/);assert.match(page,/DEMO-2026-002/);assert.match(page,/DEMO-2026-003/);
 assert.match(page,/sun’iy namuna/i);assert.match(page,/haqiqiy tashkilotga tegishli emas/i);
});
test("review decisions remain disabled until server authorization is integrated",()=>{
 for(const label of ["Ko‘rib chiqishni boshlash","Qo‘shimcha ma’lumot so‘rash","Tasdiqlash","Rad etish"]) assert.ok(page.includes(label));
 assert.match(page,/<button class="btn" disabled>/);
 assert.doesNotMatch(page,/review_supplier_verification_application\s*\(/);
});
test("reviewer demo does not access storage, documents or user data",()=>{
 assert.doesNotMatch(page,/localStorage|supabase-js|createSignedUrl|download_ticket|upload_ticket|FileReader/);
 assert.match(page,/Haqiqiy fayl biriktirilmagan/);
});
test("queue filters and detail view are present",()=>{
 assert.match(page,/id="search"/);assert.match(page,/id="statusFilter"/);assert.match(page,/function render\(/);assert.match(page,/function detail\(/);
});
test("reviewer workspace is reachable from global navigation",()=>{
 assert.ok(shell.includes('[ "Tekshiruvchi kabineti"')||shell.includes('["Tekshiruvchi kabineti","supplier-reviewer.html"]'));
});
