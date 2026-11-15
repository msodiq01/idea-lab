"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const vm=require("node:vm");
function load(){
 const context={window:null,globalThis:null};
 context.window=context;context.globalThis=context;
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../assets/idea-profile-model.js"),"utf8"),context);
 return context.IDEALAB_PROFILE_MODEL;
}
test("profile roles map to descriptive platform segments",()=>{
 const result=load().summarize({roles:["Loyiha egasi","Mutaxassis","Ko‘ngilli"]});
 assert.deepEqual(Array.from(result.segments),["G‘oya va loyiha yaratuvchisi","Mutaxassislik","Ko‘ngillilik va jamiyat"]);
 assert.equal(result.isDescriptiveOnly,true);
});
test("multiple roles in one group produce one segment",()=>{
 const result=load().summarize({roles:["Ish beruvchi","Ish izlovchi","Xaridor","Yetkazib beruvchi"]});
 assert.deepEqual(Array.from(result.segments),["Ish va karyera","Savdo va ishlab chiqarish"]);
});
test("summary cleans skills and handles empty or malformed input",()=>{
 const model=load();
 const result=model.summarize({roles:"Investor",skills:[" Dizayn ","","Dizayn","Marketing"],primaryGoal:"  Loyiha topish  "});
 assert.deepEqual(Array.from(result.segments),[]);
 assert.deepEqual(Array.from(result.skills),["Dizayn","Marketing"]);
 assert.equal(result.primaryGoal,"Loyiha topish");
 assert.equal(model.summarize(null).segments.length,0);
});
test("profile activity choices are descriptive and never presented as permissions",()=>{
 const page=fs.readFileSync(path.join(__dirname,"../profile.html"),"utf8");
 assert.match(page,/Faoliyat yo‘nalishlaringizni tanlang/);
 assert.match(page,/administrator huquqi yoki boshqa foydalanuvchilarning ma’lumotlariga kirish ruxsatini bermaydi/);
 assert.doesNotMatch(page,/Faoliyat rollaringizni tanlang/);
});

test("profile page includes live descriptive summary",()=>{
 const page=fs.readFileSync(path.join(__dirname,"../profile.html"),"utf8");
 assert.match(page,/id="personaRoleChips"/);
 assert.match(page,/updateProfilePersonaSummary\(\)/);
 assert.match(page,/idea-profile-model\.js/);
 assert.match(page,/PROFIL TA’RIFI/);
});