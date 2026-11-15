"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const shell = fs.readFileSync(path.join(root, "assets", "idea-shell.js"), "utf8");
const styles = fs.readFileSync(path.join(root, "assets", "idea-shell.css"), "utf8");

test("global navigation keeps only the core destinations in the primary row", () => {
  for (const label of ["Bosh sahifa", "Loyihalar", "Global bozor", "Jamoalar", "Qidiruv"]) {
    assert.ok(shell.includes('["' + label + '"'), "Missing primary destination: " + label);
  }
  assert.match(shell, /il-links/);
  assert.match(shell, /il-all-menu/);
});

test("related platform modules are grouped into a single directory", () => {
  for (const group of ["Kabinet va boshqaruv", "G‘oya va loyihalar", "Bozor va hamkorlik", "Jamoa va karyera", "Resurslar va ta’minot"]) {
    assert.ok(shell.includes(group), "Missing navigation group: " + group);
  }
  assert.match(shell, /il-menu-panel/);
});

test("responsive menu supports keyboard dismissal and closes after navigation", () => {
  assert.match(shell, /event\.key==="Escape"/);
  assert.match(shell, /menu\.open=false/);
  assert.match(styles, /max-height:min\(70vh,620px\)/);
});

test("the former always-visible second navigation row is disabled", () => {
  assert.match(styles, /\.il-section-nav\{display:none!important\}/);
});

test("profile identity and legacy page navigation remain available", () => {
  assert.match(shell, /localStorage\.getItem\("userProfile"\)/);
  assert.match(shell, /ideaLab:profile-updated/);
  assert.match(shell, /il-page-tools/);
});
