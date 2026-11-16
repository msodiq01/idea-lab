"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "investors.html"), "utf8");

test("investor page clearly labels the feature as a non-transactional demo", () => {
  assert.match(html, /faqat namuna ma’lumotlar/);
  assert.match(html, /haqiqiy sarmoya kiritish, pul o‘tkazish yoki moliyaviy bitim/);
  assert.match(html, /class="demo-notice"/);
});
