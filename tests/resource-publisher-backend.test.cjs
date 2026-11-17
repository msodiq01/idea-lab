"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const page=fs.readFileSync(path.join(root,"resources.html"),"utf8");
const ui=fs.readFileSync(path.join(root,"assets/idea-resource-publisher.js"),"utf8");
const adapter=fs.readFileSync(path.join(root,"assets/idea-data.js"),"utf8");

test("resource publisher is loaded after Auth and data adapter",()=>{
 assert.ok(page.indexOf('src="assets/idea-auth.js"')<page.indexOf('src="assets/idea-data.js"'));
 assert.ok(page.indexOf('src="assets/idea-data.js"')<page.indexOf('src="assets/idea-resource-publisher.js"'));
});
test("resource publisher requires a valid authenticated session",()=>{
 assert.match(ui,/auth\.getSession\(\)/);
 assert.match(ui,/avval IDEA LAB akkauntiga kiring/);
 assert.match(ui,/submit\.disabled = true/);
});
test("resource publisher sends validated fields to server and separates draft from publish",()=>{
 assert.match(adapter,/createResourceOffer\s*\(/);
 assert.match(ui,/data\.createResourceOffer\(/);
 for(const field of ["slug","title","category","quantityLabel","availabilityLabel","location","publicTerms","description","status"])
  assert.ok(ui.includes(field),field+" missing");
 assert.match(ui,/status: \$\("srPublish"\)\.checked \? "published" : "draft"/);
 assert.match(ui,/Qoralama serverda saqlandi/);
 assert.doesNotMatch(ui,/localStorage|IDEALAB\.store/);
});
