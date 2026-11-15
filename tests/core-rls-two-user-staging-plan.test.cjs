"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const plan = fs.readFileSync(
  path.join(__dirname, "..", "supabase", "verification", "rls-test-plan.md"),
  "utf8"
);
const normalized = plan.toLowerCase();

test("two-user RLS plan requires isolated staging and synthetic data", () => {
  assert.match(normalized, /alohida staging supabase loyihasida/);
  assert.match(normalized, /sintetik ma'lumotlar/);
  assert.match(normalized, /production loyihasida sinov o'tkazmang/);
});

test("two-user RLS plan separates sessions and protects service-role credentials", () => {
  assert.match(normalized, /user a va user b alohida auth akkauntlari/);
  assert.match(normalized, /alohida sessiyalardan/);
  assert.match(normalized, /service-role key brauzerga/);
  assert.match(normalized, /jwt qiymatini yozmang/);
});

test("two-user matrix covers identity, role escalation, ownership, and cross-user reads", () => {
  for (const id of ["rls-02", "rls-03", "rls-06", "rls-08", "rls-09", "rls-12", "rls-13", "rls-18", "rls-19"]) {
    assert.ok(normalized.includes(id), "Missing scenario " + id);
  }
});

test("two-user matrix covers public directory privacy and write denial", () => {
  for (const id of ["rls-15", "rls-16", "rls-17", "rls-20"]) {
    assert.ok(normalized.includes(id), "Missing scenario " + id);
  }
  assert.match(normalized, /phone\/email\/telegram\/resume_path/);
});

test("acceptance criteria prevent claiming runtime verification from static checks", () => {
  assert.match(normalized, /release blocker/);
  assert.match(normalized, /testlar hali bajarilmagan bo'lsa, natijani "verified" deb belgilamang/);
});
