"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const html = fs.readFileSync(path.join(__dirname,"..","applications.html"),"utf8");

test("Yagona arizalar markazi umumiy shell va offline cheklovini ochiq ko‘rsatadi",()=>{
 assert.match(html,/assets\/idea-shell\.css/);
 assert.match(html,/assets\/idea-shell\.js/);
 assert.match(html,/localStorage/);
 assert.match(html,/haqiqiy akkaunt, server sinxronlash/);
});
test("Besh mavjud ariza oqimi o‘zgartirmasdan birlashtiriladi",()=>{
 for(const key of ["investmentApplications","investorRequests","jobApplications","teamApplications","offerApplications","resourceOrders"]) assert.ok(html.includes(key));
});
test("Kiruvchi va yuborilgan arizalar profil identifikatori bilan filtrlanadi",()=>{
 assert.match(html,/same\(id,email\)/);
 assert.match(html,/applicantId/);
 assert.match(html,/projectOwnerId/);
 assert.match(html,/offerOwnerId/);
});
test("Qidiruv, tur va holat filtrlari mavjud",()=>{
 assert.match(html,/searchInput/);
 assert.match(html,/typeFilter/);
 assert.match(html,/statusFilter/);
});
test("Kiruvchi ariza holatini yangilash va yuborilgan arizani bekor qilish mavjud",()=>{
 assert.match(html,/update\(r,next\)/);
 assert.match(html,/Arizani qaytarib olish/);
 assert.match(html,/Qabul qilish/);
 assert.match(html,/Rad etish/);
});
test("CSV eksport faqat filtrlangan yozuvlarni oladi",()=>{
 assert.match(html,/CSV eksport/);
 assert.match(html,/visible\(\)/);
 assert.match(html,/idea-lab-arizalar\.csv/);
});
test("Bo‘sh holat va profil yo‘qligi uchun tushunarli holatlar mavjud",()=>{
 assert.match(html,/Avval profilingizni sozlang/);
 assert.match(html,/Arizalar topilmadi/);
});
test("Foydalanuvchi matni HTML sifatida kiritilmaydi",()=>{
 assert.match(html,/textContent/);
 assert.match(html,/replaceChildren/);
});

test("Ariza holatlari markaziy yadrodagi ruxsat etilgan yo‘nalish bilan boshqariladi",()=>{
 assert.match(html,/const transitions=IDEALAB\.applications\.transitions/);
 assert.match(html,/IDEALAB\.applications\.nextStatuses\(r\.status,"owner"\)/);
 assert.match(html,/IDEALAB\.applications\.nextStatuses\(from,"applicant"\)/);
});
test("Ariza yozuvi identifikatorsiz bo‘lsa noto‘g‘ri birinchi yozuv yangilanmaydi",()=>{
 assert.match(html,/else if\(all\[r\.index\]===r\.item\)current=r\.index/);
 assert.doesNotMatch(html,/all\.find\(x=>String\(x\.id\|\|""\)===String\(r\.item\.id\|\|""\)\)\|\|all\[r\.index\]/);
});
test("Holatni saqlash xatosi foydalanuvchiga bildiriladi",()=>{
 assert.match(html,/if\(!saved\|\|saved\.ok!==true\)return alert/);
});

test("Investor bilan hamkorlik so‘rovlari yagona markazda faqat yuboruvchi profilga bog‘lanadi",()=>{
 assert.match(html,/type:"investor-request"/);
 assert.match(html,/key:"investorRequests"/);
 assert.match(html,/outgoing:x=>same\(x\.applicantId,x\.applicantEmail\)/);
 assert.match(html,/incoming:\(\)=>false/);
});


test("Arizalar markazi barcha yagona holatlarni filtrlay oladi",()=>{
 for(const value of ["interview","negotiating","agreed","in_progress","completed","cancelled"]) assert.ok(html.includes('value="'+value+'"'));
 assert.match(html,/IDEALAB\.applications\.normalizeStatus/);
 assert.match(html,/IDEALAB\.applications\.nextStatuses/);
});

test("Arizalar markazi holat o‘tishlarini markaziy yadrodan oladi",()=>{
 assert.match(html,/const transitions=IDEALAB\.applications\.transitions/);
 assert.match(html,/all\[current\]\.status=next/);
});


test("Investor arizasi egasini bog‘lashda arizadagi maydonlar bo‘lmasa loyiha yozuvidan foydalanadi",()=>{
 assert.match(html,/const projects=read\("projects"\)/);
 assert.match(html,/projectForApplication=x=>projects\.find\(p=>String\(p\.id\)===String\(x\.projectId\)\)/);
 assert.match(html,/incoming:x=>\{const p=projectForApplication\(x\);return same\(x\.projectOwnerId\|\|p\?\.ownerId,x\.projectOwnerEmail\|\|p\?\.ownerEmail\)\}/);
 assert.match(html,/title:x=>x\.projectName\|\|\(projectForApplication\(x\)\?\.name\)\|\|"Loyiha"/);
});
