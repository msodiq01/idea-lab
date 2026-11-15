"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const page=fs.readFileSync(path.join(root,"supplier-verification.html"),"utf8");
const shell=fs.readFileSync(path.join(root,"assets","idea-shell.js"),"utf8");
const suppliers=fs.readFileSync(path.join(root,"suppliers.html"),"utf8");

test("supplier document center lists only allowlisted document categories",()=>{
  for(const kind of ["business_registration","representative_authority","business_address","other"]) assert.ok(page.includes(kind));
  assert.match(page,/PDF, JPEG yoki PNG/);
});
test("document center does not enable real file uploads or store document content",()=>{
  assert.doesNotMatch(page,/<input[^>]+type=["']file/i);
  assert.doesNotMatch(page,/localStorage|FileReader|uploadToSignedUrl|createSignedUploadUrl/);
  assert.match(page,/Hozir haqiqiy hujjat yuklamang/);
});
test("document center is reachable from global navigation and supplier directory",()=>{
  assert.ok(shell.includes('["Hujjatlar markazi","supplier-verification.html"]'));
  assert.ok(suppliers.includes('href="supplier-verification.html"'));
});
test("page clearly discloses that backend and verification are not live",()=>{
  assert.match(page,/Hali ulanmagan/);
  assert.match(page,/faqat interfeys maketi/);
  assert.match(page,/Edge Function deploy qilinmagan/);
});
