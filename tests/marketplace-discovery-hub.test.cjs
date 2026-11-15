"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "marketplace.html"), "utf8");

test("global marketplace acts as a discovery hub, not a duplicate project catalogue", () => {
  assert.match(html, /id="hubTitle"/);
  assert.match(html, /Global bozor — alohida takroriy loyiha katalogi emas/);
  assert.doesNotMatch(html, /id="projectList"|id="searchInput"|id="directionFilter"/);
  assert.doesNotMatch(html, /localStorage\.getItem\(["']projects["']\)/);
});

test("global marketplace groups the four distinct market destinations", () => {
  for (const destination of [
    'href="projects.html"',
    'href="exchange.html"',
    'href="investors.html"',
    'href="offers.html"'
  ]) assert.ok(html.includes(destination), "Missing market destination: " + destination);
  assert.equal((html.match(/class="hub-card"/g) || []).length, 4);
});

test("marketplace hub remains responsive and uses the shared navigation shell", () => {
  assert.match(html, /assets\/idea-shell\.css/);
  assert.match(html, /assets\/idea-shell\.js/);
  assert.match(html, /@media\(max-width:640px\)/);
  assert.match(html, /:focus-visible/);
});
