"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const readme = read("supabase/README.md");
const schema = read("supabase/schema.sql");
const runbook = read("supabase/verification/supplier-verification-staging-runbook.md");
const preflight = read("supabase/verification/supplier-verification-staging-preflight.sql");
const adminReadme = read("supabase/functions/supplier-verification-admin/README.md");
const evidenceReadme = read("supabase/functions/supplier-verification-evidence/README.md");

test("staging runbook lists all required SQL files in dependency order", () => {
  const ordered = [
    "supabase/schema.sql",
    "20261115_security_hardening.sql",
    "20261116_supplier_verification.sql",
    "20261117_supplier_verification_reviewers.sql",
    "20261118_supplier_verification_private_storage.sql",
    "20261119_supplier_verification_evidence_access_audit.sql",
    "20261120_supplier_verification_case_assignments.sql",
    "20261121_supplier_verification_admin_control.sql",
  ];
  let previous = -1;
  for (const file of ordered) {
    const index = runbook.indexOf(file);
    assert.ok(index > previous, file + " must appear in migration order");
    previous = index;
  }
  assert.match(schema, /create or replace function public\.set_updated_at\(\)/);
});

test("runbook explicitly separates staging preparation from production activation", () => {
  assert.match(runbook, /disposable staging Supabase project/i);
  assert.match(runbook, /Production rollout is a separate decision/i);
  assert.match(runbook, /SQL migrations applied: \*\*not done \/ not verified\*\*/);
  assert.match(runbook, /Edge Functions deployed: \*\*not done\*\*/);
});

test("runbook keeps secrets server-side and forbids wildcard origins", () => {
  assert.match(runbook, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(runbook, /server-side only/i);
  assert.match(runbook, /do not use `\*`/);
  assert.match(runbook, /Never add the service-role key to `IDEALAB_CONFIG`/);
  assert.match(adminReadme, /service-role key must remain server-side/i);
  assert.match(evidenceReadme, /Never send the service-role key to the browser/i);
});

test("first administrator bootstrap requires trusted owner session and placeholder only", () => {
  assert.match(runbook, /trusted database owner/i);
  assert.match(runbook, /<STAGING_AUTH_USER_UUID>/);
  assert.match(runbook, /Never commit the substituted statement or real UUID/i);
  assert.doesNotMatch(runbook, /[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
});

test("preflight is read-only and checks RLS, functions, private bucket, and grants", () => {
  assert.match(preflight, /READ ONLY/i);
  assert.match(preflight, /relrowsecurity/i);
  assert.match(preflight, /supplier-verification-private/);
  assert.match(preflight, /role_table_grants/i);
  assert.match(preflight, /pg_policies/i);
  assert.doesNotMatch(preflight, /\b(insert|update|delete|drop|alter|create)\s+(into|table|policy|function|bucket)/i);
});

test("acceptance checklist includes assignment revocation and non-admin denial", () => {
  for (const id of ["SV-03", "SV-08", "SV-10", "SV-11", "SV-12", "SV-16", "SV-17"]) {
    assert.ok(runbook.includes(id), "missing " + id);
  }
});
