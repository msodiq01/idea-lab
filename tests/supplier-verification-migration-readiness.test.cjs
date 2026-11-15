"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const migrationDir = path.join(root, "supabase", "migrations");
const runbook = fs.readFileSync(
  path.join(root, "supabase", "verification", "supplier-verification-staging-runbook.md"),
  "utf8"
);
const preflight = fs.readFileSync(
  path.join(root, "supabase", "verification", "supplier-verification-staging-preflight.sql"),
  "utf8"
);
const schema = fs.readFileSync(path.join(root, "supabase", "schema.sql"), "utf8");

const expectedMigrations = [
  "20261115_security_hardening.sql",
  "20261116_supplier_verification.sql",
  "20261117_supplier_verification_reviewers.sql",
  "20261118_supplier_verification_private_storage.sql",
  "20261119_supplier_verification_evidence_access_audit.sql",
  "20261120_supplier_verification_case_assignments.sql",
  "20261121_supplier_verification_admin_control.sql",
];

test("staging migration directory contains the reviewed ordered migration set", () => {
  const actual = fs.readdirSync(migrationDir)
    .filter((name) => /^\d{8}_.+\.sql$/.test(name))
    .sort();
  assert.deepEqual(actual, expectedMigrations);
});

test("runbook applies schema and every migration in exact dependency order", () => {
  const orderedFiles = [
    "supabase/schema.sql",
    ...expectedMigrations.map((name) => "supabase/migrations/" + name),
  ];
  let previous = -1;
  for (const file of orderedFiles) {
    const position = runbook.indexOf(file);
    assert.notEqual(position, -1, "Runbook is missing " + file);
    assert.ok(position > previous, file + " is documented out of order");
    previous = position;
  }
});

test("base schema defines the updated-at helper required by supplier migrations", () => {
  assert.match(schema, /create\s+or\s+replace\s+function\s+public\.set_updated_at\s*\(/i);
  assert.match(
    fs.readFileSync(path.join(migrationDir, "20261116_supplier_verification.sql"), "utf8"),
    /execute\s+procedure\s+public\.set_updated_at\s*\(/i
  );
});

test("read-only preflight covers all supplier verification tables and critical controls", () => {
  for (const table of [
    "supplier_verification_applications",
    "supplier_verification_evidence",
    "supplier_verification_events",
    "supplier_verification_reviewers",
    "supplier_verification_review_assignments",
    "supplier_verification_assignment_events",
    "supplier_verification_admins",
    "supplier_verification_evidence_access_events",
  ]) {
    assert.ok(preflight.includes("('" + table + "')"), "Preflight is missing table " + table);
  }

  for (const control of [
    "relrowsecurity",
    "supplier-verification-private",
    "role_table_grants",
    "security_definer",
    "search_path_pinned",
  ]) {
    assert.ok(preflight.includes(control), "Preflight is missing control " + control);
  }
});

test("preflight SQL contains only read-only query statements", () => {
  const withoutComments = preflight
    .replace(/--[^\n]*/g, "")
    .trim();
  const statements = withoutComments.split(";").map((part) => part.trim()).filter(Boolean);
  assert.ok(statements.length >= 5, "Expected multiple independent preflight result sets");
  for (const statement of statements) {
    assert.match(statement, /^(with\b[\s\S]*?\bselect\b|select\b)/i);
    assert.doesNotMatch(statement, /\b(insert|update|delete|merge|alter|create|drop|truncate|grant|revoke)\b/i);
  }
});
