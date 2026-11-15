"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("Notifications center includes recipient-specific application status events", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "notifications.html"), "utf8");
  assert.match(html, /IDEALAB\.activity\.listApplications\(\{recipientId:profile\.id/);
  assert.match(html, /Ariza holati yangilandi/);
  assert.match(html, /application-activity:/);
  assert.match(html, /subscribe\("application:activity"/);
});
