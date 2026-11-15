"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const config = fs.readFileSync(path.join(root, "supabase", "config.toml"), "utf8");
const runbook = fs.readFileSync(path.join(root, "supabase", "verification", "supplier-verification-staging-runbook.md"), "utf8");

test("sensitive Edge Functions keep Supabase gateway JWT verification enabled", () => {
  assert.match(config, /\[functions\.supplier-verification-admin\]\s*verify_jwt\s*=\s*true/);
  assert.match(config, /\[functions\.supplier-verification-evidence\]\s*verify_jwt\s*=\s*true/);
  assert.doesNotMatch(config, /verify_jwt\s*=\s*false/);
});

test("staging deployment commands target the explicit staging project and do not disable JWT verification", () => {
  assert.match(runbook, /supabase functions deploy supplier-verification-evidence --project-ref "\$STAGING_PROJECT_REF"/);
  assert.match(runbook, /supabase functions deploy supplier-verification-admin --project-ref "\$STAGING_PROJECT_REF"/);
  assert.doesNotMatch(runbook, /--no-verify-jwt/);
});
