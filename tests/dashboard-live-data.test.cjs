"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const html = fs.readFileSync(path.join(__dirname, "..", "dashboard.html"), "utf8");

test("dashboard ommaviy loyiha katalogini serverdan oladi", () => {
  assert.match(html, /listPublicProjects\(\{limit:50\}\)/);
  assert.match(html, /Ommaviy loyihalar/);
  assert.match(html, /Platformada e’lon qilingan loyihalar|Server katalogidan yuklangan/);
  assert.doesNotMatch(html, /Mening loyihalarim/);
});

test("server loyihalari xavfsiz DOM API orqali chiqariladi", () => {
  assert.match(html, /document\.createElement\("strong"\)/);
  assert.match(html, /title\.textContent=String\(project\.title/);
  assert.match(html, /target\.replaceChildren\(\)/);
  assert.match(html, /Server katalogi yuklanmoqda/);
  assert.match(html, /Loyihalarni yuklab bo‘lmadi/);
  assert.doesNotMatch(html, /target\.innerHTML\s*=.*project/);
});

test("shaxsiy arizalar faqat autentifikatsiya sessiyasi tekshirilgach yuklanadi", () => {
  assert.match(html, /const sessionResult=await auth\.getSession\(\)/);
  assert.match(html, /if\(!sessionResult\.ok\)/);
  assert.match(html, /if\(current\.authenticated\)/);
  assert.match(html, /listApplicationCenter\(\{limit:50\}\)/);
});

test("sessiyasiz yoki sessiya xatosida shaxsiy hisoblagichlar yashiriladi", () => {
  assert.match(html, /Ko‘rish uchun akkauntga kiring/);
  assert.match(html, /Sessiyani tekshirib bo‘lmadi/);
  assert.match(html, /applicationCount.*textContent="—"/s);
});

test("backend xatosi mahalliy keshdagi raqamlarni server natijasi sifatida ko‘rsatmaydi", () => {
  assert.match(html, /Server katalogini yuklab bo‘lmadi/);
  assert.match(html, /Server arizalarini yuklab bo‘lmadi/);
  assert.match(html, /Server bilan aloqa xatosi/);
});

test("offline statistikalar mahalliy ma’lumot deb aniq belgilangan", () => {
  assert.match(html, /Mahalliy loyihalar/);
  assert.match(html, /Mahalliy arizalar/);
  assert.match(html, /Faqat ushbu brauzerda saqlangan/);
});


test("dashboard server kataloglari va ochiq takliflar jonli gateway orqali olinadi", () => {
  assert.match(html, /listPublicResources\(\{limit:50\}\)/);
  assert.match(html, /listPublicPartnerships\(\{limit:50\}\)/);
  assert.match(html, /Server katalogi: resurslar va hamkorlik/);
  assert.doesNotMatch(html, /read\("ideaLabExchangeItems"\)/);
});

test("namunaviy analitika haqiqiy tarixiy ma’lumot sifatida ko‘rsatilmaydi", () => {
  assert.match(html, /Grafik hozircha dizayn namunasi/);
});


test("faollik grafigi soxta qiymatlar emas, serverdagi published_at sanalaridan tuziladi", () => {
  assert.match(html, /function renderProjectActivity\(projects\)/);
  assert.match(html, /project\.published_at/);
  assert.match(html, /renderProjectActivity\(serverProjects\)/);
  assert.match(html, /oxirgi 50 ta katalog yozuvi doirasida/);
  assert.doesNotMatch(html, /--h:38%|--h:52%|--h:100%/);
});

test("grafik oylar bo‘yicha DOM API orqali qayta quriladi", () => {
  assert.match(html, /chart\.replaceChildren\(\)/);
  assert.match(html, /document\.createElement\("div"\)/);
  assert.match(html, /bar\.setAttribute\("aria-label"/);
});
