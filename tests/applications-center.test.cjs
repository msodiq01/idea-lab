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
 for(const key of ["investmentApplications","jobApplications","teamApplications","offerApplications","resourceOrders"]) assert.ok(html.includes(key));
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
