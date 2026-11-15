"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migration = fs.readFileSync(
  path.join(__dirname, "..", "supabase", "migrations", "20261122_application_activity_notifications.sql"),
  "utf8"
);

test("Server application activity is participant-scoped and append-only", () => {
  assert.match(migration, /create table if not exists public\.application_activity/);
  assert.match(migration, /actor_id = auth\.uid\(\) or recipient_id = auth\.uid\(\)/);
  assert.match(migration, /revoke all on public\.application_activity from anon, authenticated/);
  assert.match(migration, /grant select on public\.application_activity to authenticated/);
  assert.doesNotMatch(migration, /grant\s+(insert|update|delete|all).*application_activity\s+to\s+authenticated/i);
});

test("All four application types have trusted status-event triggers", () => {
  for (const [table, trigger, kind] of [
    ["project_investment_applications", "log_investment_application_activity", "investment"],
    ["team_applications", "log_team_application_activity", "team"],
    ["job_applications", "log_job_application_activity", "job"],
    ["offer_applications", "log_offer_application_activity", "offer"]
  ]) {
    assert.match(migration, new RegExp("create trigger " + trigger));
    assert.match(migration, new RegExp("on public\\." + table));
    assert.ok(migration.includes("'" + kind + "'"));
  }
  assert.match(migration, /if v_actor is distinct from v_applicant then/);
  assert.match(migration, /only application participants may change its status/i);
});

test("Server events normalize legacy status labels and record no contact details", () => {
  assert.match(migration, /normalize_application_activity_status/);
  assert.match(migration, /'yangi' then 'submitted'/i);
  assert.match(migration, /'qabul qilindi' then 'accepted'/i);
  assert.doesNotMatch(migration, /email|phone|telegram|resume_path/i);
});
