"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("Investor, job, team and offer application updates append to shared activity history", () => {
  const root = path.join(__dirname, "..");
  const cases = [
    ["investors.html", 'source: "investmentApplications"'],
    ["teams.html", 'source: "jobApplications"'],
    ["teams.html", 'source: "teamApplications"'],
    ["offers.html", 'source: "offerApplications"']
  ];
  for (const [file, source] of cases) {
    const html = fs.readFileSync(path.join(root, file), "utf8");
    assert.ok(html.includes("ideaCore.activity.recordApplication"), file + " should record application activity");
    assert.ok(html.includes(source), file + " should identify the source");
  }
});

test("Team membership application status changes validate the shared transition graph", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "teams.html"), "utf8");
  assert.match(html, /nextStatuses\(previousStatus, "owner"\)\.includes\(select\.value\)/);
});
