"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const schema = fs.readFileSync(path.join(__dirname, "../supabase/schema.sql"), "utf8");
const core = fs.readFileSync(path.join(__dirname, "../assets/idea-core.js"), "utf8");
const profile = fs.readFileSync(path.join(__dirname, "../profile.html"), "utf8");
const audit = fs.readFileSync(path.join(__dirname, "../PROFILE-PRIVACY-RLS-AUDIT.md"), "utf8");

test("privacy audit records broad catalog reads on contact-bearing tables", () => {
  for (const table of ["projects", "teams", "job_posts", "specialist_profiles", "offers", "investors", "resources"]) {
    assert.match(schema, new RegExp('on public\\.' + table + ' for select to authenticated'));
  }
  for (const field of ["owner_email", "owner_phone", "phone", "telegram", "email", "contact"]) {
    assert.ok(schema.includes(field), "expected contact field in SQL draft: " + field);
  }
  assert.match(audit, /Public projection/);
  assert.match(audit, /kontaktlar/);
});

test("user-editable profile roles are not described as privileged permissions", () => {
  assert.match(schema, /roles text\[\] not null default '\{\}'/);
  assert.match(schema, /Users can update their profile/);
  assert.match(profile, /name="userRoles"/);
  assert.match(audit, /faqat qiziqish\/faoliyat teglari/);
  assert.match(audit, /server-side alohida boshqarilsin/);
});

test("legacy email matching is identified as demo-only, not server authorization", () => {
  assert.match(core, /identity = Object\.freeze/);
  assert.match(core, /emailField/);
  assert.match(audit, /server ruxsati yoki migratsiya egasini aniqlash uchun hech qachon ishlatmaslik/);
});

test("privacy audit explicitly confirms no live schema migration", () => {
  assert.match(audit, /SQL Supabase'ga qo'llanmagan/);
  assert.match(audit, /SQL policy, jadval, frontend sahifalari va localStorage ma'lumotlari o'zgartirilmadi/);
});
