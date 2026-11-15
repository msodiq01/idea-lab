"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const html = fs.readFileSync(path.join(__dirname, "..", "offers.html"), "utf8");

test("Chat o‘qilmagan xabarlarni joriy foydalanuvchi kesimida hisoblaydi", () => {
  assert.match(html, /function getUnreadCount\(applicationId\)/);
  assert.match(html, /message\.sender !== currentUser/);
  assert.match(html, /application\.lastReadBy\[currentUser\]/);
});

test("Suhbat ochilganda o‘qilgan vaqt saqlanadi", () => {
  assert.match(html, /function markConversationRead\(applicationId\)/);
  assert.match(html, /application\.lastReadBy\[currentUser\] = new Date\(\)\.toISOString\(\)/);
  assert.match(html, /if \(!markConversationRead\(applicationId\)\)/);
});

test("Suhbatlar ro‘yxatida yangi xabarlar soni ko‘rsatiladi", () => {
  assert.match(html, /const unread = getUnreadCount\(application\.id\)/);
  assert.match(html, /o‘qilmagan xabar/);
});

test("Eski xabarlar va mavjud saqlash kalitlari saqlanib qoladi", () => {
  assert.match(html, /readData\("offerMessages"\)/);
  assert.match(html, /saveData\("offerApplications", applications\)/);
  assert.match(html, /applicationId: activeApplicationId/);
});

test("Chat xabar matni HTML sifatida chiqarilmaydi", () => {
  assert.match(html, /escapeHTML\(message\.text \|\| ""\)/);
});
