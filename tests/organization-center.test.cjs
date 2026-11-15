"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const page = fs.readFileSync(path.join(root, "organizations.html"), "utf8");
const shell = fs.readFileSync(path.join(root, "assets", "idea-shell.js"), "utf8");
const dashboard = fs.readFileSync(path.join(root, "dashboard.html"), "utf8");

function inlineScripts(source) {
  return Array.from(source.matchAll(/<script>([\s\S]*?)<\/script>/g), match => match[1]);
}

test("1. Organization Center sahifasi mavjud va offline demo holatini bildiradi", () => {
  assert.match(page, /ORGANIZATION CENTER/);
  assert.match(page, /Server ulanmagan/);
  assert.match(page, /mahalliy saqlash/i);
});

test("2. Tashkilot formasi asosiy maydonlarni taqdim etadi", () => {
  for (const id of ["orgName", "orgType", "orgLocation", "orgWebsite", "orgDescription"]) {
    assert.match(page, new RegExp('id="' + id + '"'));
  }
});

test("3. Tashkilotlar markaziy namespaced store orqali saqlanadi", () => {
  assert.match(page, /core\.store\.get\(STORAGE_KEY/);
  assert.match(page, /core\.store\.set\(STORAGE_KEY/);
  assert.match(page, /const STORAGE_KEY="organizations"/);
});

test("4. A'zolar uchun email, telefon yoki parol yig'ilmaydi", () => {
  assert.match(page, /id="memberName"/);
  assert.doesNotMatch(page, /id="memberEmail"/);
  assert.doesNotMatch(page, /id="memberPhone"/);
  assert.doesNotMatch(page, /id="memberPassword"/);
});

test("5. A'zoni o'chirish o'rniga nofaol holatga o'tkazish qo'llanadi", () => {
  assert.match(page, /m\.status="removed"/);
  assert.match(page, /Faol emas/);
});

test("6. Loyihalar ID orqali bog'lanadi va asl loyiha yozuvi o'zgartirilmaydi", () => {
  assert.match(page, /projectIds/);
  assert.match(page, /Asl loyiha yozuvi o‘zgarmadi/);
  assert.match(page, /core\.legacy\.read\("projects"/);
});

test("7. Tashkilot website havolasi faqat HTTP(S) protokollarini qabul qiladi", () => {
  assert.match(page, /\["http:","https:"\]/);
  assert.match(page, /noopener noreferrer/);
});

test("8. Global navigatsiya va dashboard Organization Centerga olib boradi", () => {
  assert.match(shell, /\["Tashkilotlar","organizations\.html"\]/);
  assert.match(dashboard, /href="organizations\.html"/);
});

test("9. Inline JavaScript sintaksisi xatosiz", () => {
  for (const source of inlineScripts(page)) {
    assert.doesNotThrow(() => new Function(source));
  }
  assert.ok(inlineScripts(page).length > 0);
});

test("10. Muhim UI element IDlari takrorlanmaydi", () => {
  const ids = Array.from(page.matchAll(/\bid="([^"]+)"/g), match => match[1]);
  assert.equal(ids.length, new Set(ids).size);
});
