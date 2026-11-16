"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const migration = fs.readFileSync(
  path.join(__dirname, "..", "supabase", "migrations", "20261116170000_add_missing_foreign_key_indexes.sql"),
  "utf8"
).toLowerCase();

test("foreign-key performance migration adds only the 11 advisor-flagged indexes", () => {
  const indexes = [
    ["organization_members", "invited_by"],
    ["partnership_enquiries", "project_id"],
    ["partnership_opportunities", "owner_id"],
    ["partnership_opportunities", "project_id"],
    ["project_members", "invited_by"],
    ["project_tasks", "created_by"],
    ["project_updates", "author_id"],
    ["resource_offers", "owner_id"],
    ["resource_offers", "project_id"],
    ["resource_requests", "project_id"],
    ["specialist_requests", "requested_by"],
  ];

  for (const [table, column] of indexes) {
    const pattern = new RegExp(
      "create index if not exists [a-z0-9_]+\\s+on " +
      table + "\\s*\\(" + column + "\\)"
    );
    assert.match(migration, pattern, "Missing index for " + table + "." + column);
  }
  assert.equal((migration.match(/create index if not exists/g) || []).length, 11);
});

test("migration does not modify policies, grants, or application rows", () => {
  assert.doesNotMatch(migration, /create policy|drop policy|grant |revoke |insert into|update |delete from|truncate/);
});

test("existing partial foreign-key indexes are not duplicated", () => {
  assert.doesNotMatch(migration, /on idea_app\\.project_tasks\\s*\\(assignee_id\\)/);
  assert.doesNotMatch(migration, /on idea_app\\.projects\\s*\\(organization_id\\)/);
});
