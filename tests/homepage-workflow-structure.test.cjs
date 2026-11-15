"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

test("homepage presents one primary workflow instead of duplicate module grids", () => {
  assert.match(html, /id="ecosystem-map"/);
  assert.match(html, /class="workflow-list"/);
  assert.doesNotMatch(html, /class="feature-grid"/);
  assert.doesNotMatch(html, /Bitta platforma\. Cheksiz imkoniyatlar/);
});

test("homepage workflow has six ordered stages", () => {
  for (const stage of ["01", "02", "03", "04", "05", "06"]) {
    assert.match(html, new RegExp('<span class="workflow-number">' + stage + '</span>'));
  }
  assert.equal((html.match(/class="workflow-step"/g) || []).length, 6);
});

test("related destinations are grouped within their relevant workflow stage", () => {
  for (const destination of [
    'href="projects.html"', 'href="teams.html"', 'href="specialists.html"',
    'href="exchange.html"', 'href="marketplace.html"', 'href="investors.html"',
    'href="offers.html"', 'href="applications.html"', 'href="dashboard.html"'
  ]) assert.ok(html.includes(destination), "Missing destination: " + destination);
});

test("homepage keeps project discovery and project creation available", () => {
  assert.match(html, /id="recentProjects"/);
  assert.match(html, /id="projectForm"/);
  assert.match(html, /id="create-project"/);
  assert.match(html, /showRecentProjects/);
});

test("workflow is responsive and preserves readable mobile layout", () => {
  assert.match(html, /@media \(max-width: 700px\)/);
  assert.match(html, /grid-template-columns: 42px minmax\(0, 1fr\)/);
  assert.match(html, /workflow-links/);
});
