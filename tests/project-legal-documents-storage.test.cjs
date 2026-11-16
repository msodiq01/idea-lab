"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const migration = fs.readFileSync(
  path.join(root, "supabase/migrations/20261116200000_private_project_legal_documents.sql"),
  "utf8"
).toLowerCase();
const gateway = fs.readFileSync(path.join(root, "assets/idea-data.js"), "utf8");
const home = fs.readFileSync(path.join(root, "index.html"), "utf8");

test("project legal document bucket is private and PDF-only with a 10 MB cap", () => {
  assert.match(migration, /'idea-project-legal-documents'[\s\S]*false[\s\S]*10485760[\s\S]*application\/pdf/);
  assert.match(home, /accept="application\/pdf,\.pdf"/);
  assert.match(home, /5 tagacha PDF, har biri 10 MB gacha/);
});

test("storage policies restrict read, upload and delete to the authenticated project owner", () => {
  for (const action of ["select", "insert", "delete"]) {
    assert.match(migration, new RegExp("on storage\\.objects for " + action));
  }
  assert.equal((migration.match(/idea_private\.is_project_owner/g) || []).length, 3);
  assert.equal((migration.match(/\(select auth\.uid\(\)\)::text/g) || []).length, 3);
  assert.doesNotMatch(migration, /to anon|public, anon|public\s*=\s*true/);
});

test("browser upload gateway validates files and uses the verified session identity", () => {
  assert.match(gateway, /uploadProjectLegalDocuments/);
  assert.match(gateway, /client\.auth\.getUser\(\)/);
  assert.match(gateway, /client\.storage\.from\(bucket\)\.upload/);
  assert.match(gateway, /10 \* 1024 \* 1024/);
  assert.match(gateway, /files\.length > 5/);
  assert.match(gateway, /crypto\.randomUUID\(\)/);
  assert.doesNotMatch(gateway, /service_role|serviceRole|secret_key/i);
});

test("project form requires a goal and keeps structured project needs in the saved description", () => {
  assert.match(home, /id="projectGoal"[^>]*required/);
  assert.match(home, /Loyiha maqsadi: " \+ goal/);
  assert.match(home, /Kerakli mutaxassislar: /);
  assert.match(home, /Kerakli resurslar: /);
  assert.match(home, /Qo‘shimcha ehtiyojlar: /);
});
