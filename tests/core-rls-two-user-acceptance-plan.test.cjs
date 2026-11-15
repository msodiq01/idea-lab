"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const plan = fs.readFileSync(
  path.join(__dirname, "..", "supabase", "verification", "rls-test-plan.md"),
  "utf8"
);

test("two-user staging plan covers core ownership and identity boundaries", () => {
  for (const scenario of [
    "RLS-02", "RLS-03", "RLS-04", "RLS-05", "RLS-06",
    "RLS-07", "RLS-08", "RLS-09", "RLS-10", "RLS-11",
    "RLS-12", "RLS-13", "RLS-14", "RLS-16", "RLS-17",
    "RLS-18", "RLS-19", "RLS-20", "RLS-21",
  ]) {
    assert.ok(plan.includes(scenario), "Missing acceptance scenario " + scenario);
  }
});

test("two-user staging plan requires independent users and protects credentials", () => {
  assert.match(plan, /User A va User B — alohida/);
  assert.match(plan, /alohida access token/);
  assert.match(plan, /Service-role kalitini brauzerga/);
  assert.match(plan, /Token, parol, service-role kaliti/);
  assert.match(plan, /Production ma'lumotlariga tegmang/);
});

test("two-user plan distinguishes public views from base-table access", () => {
  assert.match(plan, /Public directory view grant'i asosiy jadvalga kirish bermaydi/);
  assert.match(plan, /telefon\/email\/resume_path\/private contact/);
  assert.match(plan, /Bu reja real staging natijalarini o'zi tasdiqlamaydi/);
});
