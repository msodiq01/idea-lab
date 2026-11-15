"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const migrations = path.join(root, "supabase", "migrations");
const read = (name) => fs.readFileSync(path.join(migrations, name), "utf8");

const core = read("20261116_supplier_verification.sql");
const reviewers = read("20261117_supplier_verification_reviewers.sql");
const storage = read("20261118_supplier_verification_private_storage.sql");
const accessAudit = read("20261119_supplier_verification_evidence_access_audit.sql");
const assignments = read("20261120_supplier_verification_case_assignments.sql");
const admin = read("20261121_supplier_verification_admin_control.sql");

test("security-definer verification functions pin pg_catalog before public", () => {
  assert.match(core, /security\s+definer\s+set\s+search_path\s*=\s*pg_catalog,\s*public/i);
  assert.match(reviewers, /security\s+definer\s+set\s+search_path\s*=\s*pg_catalog,\s*public/i);
  assert.match(assignments, /security\s+definer\s+set\s+search_path\s*=\s*pg_catalog,\s*public/i);
  assert.match(admin, /security\s+definer\s+set\s+search_path\s*=\s*pg_catalog,\s*public/i);
});

test("every sensitive verification table has RLS enabled", () => {
  const tableMigrations = [
    [core, "supplier_verification_applications"],
    [core, "supplier_verification_evidence"],
    [core, "supplier_verification_events"],
    [reviewers, "supplier_verification_reviewers"],
    [accessAudit, "supplier_verification_evidence_access_events"],
    [assignments, "supplier_verification_review_assignments"],
    [admin, "supplier_verification_admins"],
    [admin, "supplier_verification_assignment_events"],
  ];

  for (const [sql, table] of tableMigrations) {
    assert.match(
      sql,
      new RegExp("alter\\s+table\\s+public\\." + table + "\\s+enable\\s+row\\s+level\\s+security", "i"),
      table + " must have RLS enabled"
    );
  }
});

test("client table grants are limited to supplier-owned reads and application submission", () => {
  assert.match(core, /grant\s+select,\s*insert\s+on\s+public\.supplier_verification_applications\s+to\s+authenticated/i);
  assert.match(core, /grant\s+select\s+on\s+public\.supplier_verification_events\s+to\s+authenticated/i);

  for (const table of [
    "supplier_verification_evidence",
    "supplier_verification_reviewers",
    "supplier_verification_evidence_access_events",
    "supplier_verification_review_assignments",
    "supplier_verification_admins",
    "supplier_verification_assignment_events",
  ]) {
    const allMigrations = [core, reviewers, accessAudit, assignments, admin].join("\n");
    assert.match(
      allMigrations,
      new RegExp("revoke\\s+all\\s+on\\s+public\\." + table + "\\s+from\\s+public,\\s*anon,\\s*authenticated", "i"),
      table + " must deny direct client table access"
    );
  }
});

test("supplier application policies are owner-scoped and submission-only", () => {
  assert.match(core, /for\s+select\s+to\s+authenticated\s+using\s*\(\s*supplier_user_id\s*=\s*auth\.uid\(\)\s*\)/i);
  assert.match(core, /for\s+insert\s+to\s+authenticated\s+with\s+check\s*\(\s*supplier_user_id\s*=\s*auth\.uid\(\)\s+and\s+status\s*=\s*'submitted'/i);
  assert.match(core, /before\s+insert\s+on\s+public\.supplier_verification_applications/i);
  assert.match(core, /new\.supplier_user_id\s*:=\s*auth\.uid\(\)/i);
  assert.doesNotMatch(core, /create\s+policy[\s\S]{0,240}for\s+update\s+to\s+authenticated/i);
  assert.doesNotMatch(core, /create\s+policy[\s\S]{0,240}for\s+delete\s+to\s+authenticated/i);
});

test("reviewer reads and decisions require active reviewer plus exact case assignment", () => {
  assert.match(assignments, /create\s+or\s+replace\s+function\s+public\.can_review_supplier_verification_application/i);
  assert.match(assignments, /a\.application_id\s*=\s*p_application_id/i);
  assert.match(assignments, /a\.reviewer_user_id\s*=\s*auth\.uid\(\)/i);
  assert.match(assignments, /a\.is_active\s*=\s*true/i);
  assert.match(assignments, /r\.is_active\s*=\s*true/i);
  assert.match(assignments, /using\s*\(\s*public\.can_review_supplier_verification_application\(id\)\s*\)/i);
  assert.match(assignments, /using\s*\(\s*public\.can_review_supplier_verification_application\(application_id\)\s*\)/i);
  assert.match(assignments, /active\s+case\s+assignment\s+required/i);
});

test("private evidence upload and reads are owner- or assignment-scoped", () => {
  assert.match(storage, /values\s*\([\s\S]{0,160}'supplier-verification-private'[\s\S]{0,120}false/i);
  assert.match(storage, /insert\s+into\s+storage\.buckets\s*\([^)]*file_size_limit[^)]*\)\s*values\s*\([\s\S]{0,200}10485760/i);
  assert.match(storage, /application\/pdf[\s\S]{0,100}image\/jpeg[\s\S]{0,100}image\/png/i);
  assert.match(storage, /a\.supplier_user_id\s*=\s*auth\.uid\(\)/i);
  assert.match(storage, /a\.status\s+in\s*\(\s*'submitted'\s*,\s*'needs_more_info'\s*\)/i);
  assert.match(assignments, /create\s+policy\s+"Assigned reviewers read verification evidence"[\s\S]*?public\.can_review_supplier_verification_application\(a\.id\)/i);
  assert.doesNotMatch(storage + assignments, /create\s+policy[\s\S]{0,300}\bon\s+storage\.objects\s+for\s+(update|delete)\b/i);
});

test("audit, reviewer, assignment and administrator control tables are not client-readable or writable", () => {
  for (const [sql, table] of [
    [reviewers, "supplier_verification_reviewers"],
    [accessAudit, "supplier_verification_evidence_access_events"],
    [assignments, "supplier_verification_review_assignments"],
    [admin, "supplier_verification_admins"],
    [admin, "supplier_verification_assignment_events"],
  ]) {
    assert.match(sql, new RegExp("alter\\s+table\\s+public\\." + table + "\\s+enable\\s+row\\s+level\\s+security", "i"));
    assert.match(sql, new RegExp("grant\\s+all\\s+on\\s+public\\." + table + "\\s+to\\s+service_role", "i"));
    assert.match(sql, new RegExp("revoke\\s+all\\s+on\\s+public\\." + table + "\\s+from\\s+public,\\s*anon,\\s*authenticated", "i"));
  }
});
