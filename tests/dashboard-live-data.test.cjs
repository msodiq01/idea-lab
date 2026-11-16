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
  assert.doesNotMatch(html, /target\.innerHTML\s*=.*project/);
});

test("shaxsiy arizalar faqat autentifikatsiya sessiyasi tekshirilgach yuklanadi", () => {
  assert.match(html, /const sessionResult=await auth\.getSession\(\)/);
  assert.match(html, /if\(!sessionResult\.ok\)/);
  assert.match(html, /if\(current\.authenticated\)/);
  assert.match(html, /listApplicationCenter\(\{limit:50\}\)/);
  assert.match(html, /security_invoker/); // documented database view security contract
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
