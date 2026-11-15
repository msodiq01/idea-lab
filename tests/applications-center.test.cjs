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
 assert.match(html,/Arizani bekor qilish/);
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

test("Ariza holatlari faqat ruxsat etilgan yo‘nalishda o‘zgaradi",()=>{
 assert.match(html,/const transitions=\{submitted:\["reviewing","accepted","rejected","withdrawn"\],reviewing:\["accepted","rejected","withdrawn"\],accepted:\[\],rejected:\[\],withdrawn:\[\]\}/);
 assert.match(html,/function canTransition\(from,to,direction\)/);
 assert.match(html,/canTransition\(r\.status,key,"incoming"\)/);
 assert.match(html,/canTransition\(r\.status,"withdrawn","outgoing"\)/);
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
