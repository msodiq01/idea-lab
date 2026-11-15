"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const sql = fs.readFileSync(
  path.join(__dirname, "..", "supabase", "verification", "supplier-verification-staging-preflight.sql"),
  "utf8"
);

test("Application activity preflight checks RLS, participant policy, grants and all triggers", () => {
  for (const token of [
    "application_activity",
    "recipient_id",
    "actor_id",
    "log_investment_application_activity",
    "log_team_application_activity",
    "log_job_application_activity",
    "log_offer_application_activity",
    "log_application_activity"
  ]) assert.ok(sql.includes(token), "Missing preflight check: " + token);
});

test("Application activity staging preflight remains read-only", () => {
  assert.doesNotMatch(sql, /\b(insert\s+into|update\s+public|delete\s+from|alter\s+table|create\s+table|drop\s+table)\b/i);
  assert.match(sql, /information_schema\.role_table_grants/);
  assert.match(sql, /pg_policies/);
});
