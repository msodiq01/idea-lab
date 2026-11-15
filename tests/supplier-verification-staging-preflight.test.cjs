"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const preflight = fs.readFileSync(
  path.join(root, "supabase/verification/supplier-verification-staging-preflight.sql"),
  "utf8"
);

test("staging preflight checks critical columns across every verification table", () => {
  for (const column of [
    "supplier_user_id", "consent_version", "submitted_at", "private_storage_path",
    "uploaded_at", "reason_code", "reviewer_user_id", "revoked_at",
    "assignment_id", "actor_user_id", "evidence_id"
  ]) {
    assert.match(preflight, new RegExp("'" + column + "'"));
  }
  assert.match(preflight, /information_schema\.columns/i);
});

test("staging preflight checks SECURITY DEFINER and pinned search_path on privileged functions", () => {
  assert.match(preflight, /prosecdef/i);
  assert.match(preflight, /search_path_pinned/i);
  assert.match(preflight, /search_path=pg_catalog, public/i);
  assert.match(preflight, /record_supplier_verification_submission/i);
  assert.match(preflight, /admin_revoke_supplier_verification_case/i);
});

test("preflight remains read-only", () => {
  assert.match(preflight, /READ ONLY/i);
  assert.doesNotMatch(preflight, /\b(insert|update|delete|drop|alter|create)\s+(into|table|policy|function|bucket)/i);
});
