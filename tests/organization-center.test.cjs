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

test("11. Tashkilot profilini tahrirlash formasi mavjud", () => {
  for (const id of ["editOrgName", "editOrgType", "editOrgLocation", "editOrgWebsite", "editOrgDescription"]) {
    assert.match(page, new RegExp('id="' + id + '"'));
  }
  assert.match(page, /editOrganizationForm/);
});

test("12. Logo belgisi va rang variantlari mavjud", () => {
  assert.match(page, /id="detailLogo"/);
  assert.match(page, /id="editOrgTone"/);
  assert.match(page, /id="editOrgMark"/);
  for (const tone of ["violet", "amber", "green", "rose"]) assert.match(page, new RegExp(tone));
});

test("13. A'zolarni qidirish va holat bo'yicha filtrlash mavjud", () => {
  assert.match(page, /id="memberSearch"/);
  assert.match(page, /id="memberFilter"/);
  assert.match(page, /addEventListener\("input"/);
});

test("14. A'zolik takliflari alohida pending holatida yaratiladi", () => {
  assert.match(page, /status:"invited"/);
  assert.match(page, /Taklif kutilmoqda/);
  assert.match(page, /Haqiqiy xabar yuborilmadi/);
});

test("15. Taklifni qabul qilish yoki rad etish demo holatlari mavjud", () => {
  assert.match(page, /\["Qabul qilish","active"\]/);
  assert.match(page, /\["Rad etish","declined"\]/);
});

test("16. Takroriy faol a'zo taklifi to'siladi", () => {
  assert.match(page, /Bu ism bilan a’zo yoki taklif allaqachon mavjud/);
});

test("17. Loyihalarni qidirish va bog'lanishlar soni ko'rsatiladi", () => {
  assert.match(page, /id="projectSearch"/);
  assert.match(page, /ta bog‘langan/);
});

test("18. Tashkilot logo rasmi emas, xavfsiz matn belgisi bilan ko'rsatiladi", () => {
  assert.match(page, /function initials/);
  assert.doesNotMatch(page, /id="logoUpload"/);
});

test("19. Mobil moslashuv uchun kichik ekran qoidalari mavjud", () => {
  assert.match(page, /@media\(max-width:520px\)/);
  assert.match(page, /oc-edit-grid/);
});

test("20. Tashkilot yangilanishlari updatedAt vaqtini belgilaydi", () => {
  assert.match(page, /updatedAt:new Date\(\)\.toISOString\(\)/);
});
