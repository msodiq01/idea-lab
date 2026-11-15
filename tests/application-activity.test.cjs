"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const core = fs.readFileSync(path.join(__dirname, "..", "assets", "idea-core.js"), "utf8");

function createCore() {
  const data = new Map([["userProfile", JSON.stringify({ id: "user-1", fullName: "Test User", email: "test@example.com" })]]);
  const localStorage = {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key)
  };
  const window = { localStorage, crypto: { randomUUID: () => "event-" + Math.random().toString(36).slice(2) }, console };
  vm.runInNewContext(core, { window, console, Date, Math, Intl, JSON, String, Number, Object, Array, Set, Map, TypeError });
  return window.IDEALAB;
}

test("Application activity records valid transitions and filters by recipient", () => {
  const api = createCore();
  const result = api.activity.recordApplication(
    { id: "app-1", status: "reviewing", projectName: "Demo loyiha" },
    { source: "investmentApplications", fromStatus: "submitted", toStatus: "reviewing", recipientId: "applicant-1" }
  );
  assert.equal(result.ok, true);
  assert.equal(result.event.applicationId, "app-1");
  assert.equal(result.event.actorId, "user-1");
  assert.equal(api.activity.listApplications({ recipientId: "applicant-1" }).length, 1);
  assert.equal(api.activity.listApplications({ recipientId: "other-user" }).length, 0);
});

test("Application activity rejects invalid transitions without writing a record", () => {
  const api = createCore();
  const result = api.activity.recordApplication(
    { id: "app-2", status: "completed" },
    { source: "jobApplications", fromStatus: "submitted", toStatus: "completed" }
  );
  assert.equal(result.ok, false);
  assert.equal(api.activity.listApplications().length, 0);
});

test("Applications center records and renders per-application status history", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "applications.html"), "utf8");
  assert.match(html, /IDEALAB\.activity\.recordApplication/);
  assert.match(html, /IDEALAB\.activity\.listApplications/);
  assert.match(html, /Holat tarixi/);
});
