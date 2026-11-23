"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const sw = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");

test("PWA yangi dizayn bilan birga yangi cache versiyasidan foydalanadi", () => {
  assert.match(sw, /CACHE_NAME\s*=\s*['"]idea-lab-mobile-v4['"]/);
  assert.doesNotMatch(sw, /idea-lab-mobile-v3/);
  assert.match(sw, /["']\.\/assets\/idea-nextgen\.css["']/);
});

test("offline app shell ro‘yxati takroriy yo‘llardan xoli", () => {
  const match = sw.match(/const APP_SHELL = \[([\s\S]*?)\];/);
  assert.ok(match, "APP_SHELL ro‘yxati topilishi kerak");
  const entries = [...match[1].matchAll(/["']([^"']+)["']/g)].map(item => item[1]);
  assert.ok(entries.length >= 30, "Asosiy offline sahifalar keshga kiritilishi kerak");
  assert.equal(new Set(entries).size, entries.length, "APP_SHELL ichida takroriy yo‘l bo‘lmasligi kerak");
  assert.ok(entries.every(item => item.startsWith("./")), "Barcha offline yo‘llar nisbiy bo‘lishi kerak");
});

test("offline navigatsiya uchun app.html fallback saqlangan", () => {
  assert.match(sw, /if\s*\(request\.mode\s*===\s*['"]navigate['"]\)\s*return\s+caches\.match\(['"]\.\/app\.html['"]\)/);
});

test("faqat muvaffaqiyatli same-origin GET javoblari cache qilinadi", () => {
  assert.match(sw, /request\.method\s*!==\s*['"]GET['"]/);
  assert.match(sw, /new URL\(request\.url\)\.origin !== self\.location\.origin/);
  assert.match(sw, /if\s*\(response\.ok\)/);
});
