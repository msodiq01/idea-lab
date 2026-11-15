"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const html = fs.readFileSync(path.join(__dirname, "..", "profile.html"), "utf8");

test("Kabinetda profil rasmi tanlash va jonli preview uchun boshqaruvlar mavjud", () => {
  assert.match(html, /id="avatarInput" type="file" accept="image\/jpeg,image\/png,image\/webp"/);
  assert.match(html, /id="avatarPreview"/);
  assert.match(html, /id="removeAvatar"/);
  assert.match(html, /id="avatarStatus" role="status"/);
});

test("Profil rasmi turi va 5 MB hajm chegarasi tekshiriladi", () => {
  assert.match(html, /\["image\/jpeg","image\/png","image\/webp"\]\.includes\(file\.type\)/);
  assert.match(html, /file\.size>5\*1024\*1024/);
});

test("Yuklangan rasm kichraytirilib JPEG ko‘rinishida optimallashtiriladi", () => {
  assert.match(html, /maxSide=320/);
  assert.match(html, /canvas\.toDataURL\("image\/jpeg",0\.78\)/);
});

test("Profil rasmi userProfile yozuviga qo‘shiladi va qayta yuklanganda tiklanadi", () => {
  assert.match(html, /avatarData:avatarData/);
  assert.match(html, /avatarData=typeof profile\.avatarData==="string"\?profile\.avatarData:""/);
  assert.match(html, /image\.alt="Tanlangan profil rasmi"/);
});

test("Profil rasmi olib tashlanganda preview va saqlanadigan qiymat bo‘shatiladi", () => {
  assert.match(html, /removeAvatar.*avatarData="";avatarInput\.value="";renderAvatar\(\)/);
});

test("Kabinetdagi inline JavaScript sintaksisi to‘g‘ri", () => {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length, "inline script topilmadi");
  assert.doesNotThrow(() => new vm.Script(scripts[scripts.length - 1][1]));
});
