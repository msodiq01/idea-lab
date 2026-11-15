"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const script = fs.readFileSync(path.join(__dirname, "..", "scripts", "supplier-verification-staging-smoke.mjs"), "utf8");

test("staging smoke runner requires an explicit staging confirmation and matching project ref", () => {
  assert.match(script, /STAGING_CONFIRM !== "YES"/);
  assert.match(script, /base\.hostname !== projectRef \+ "\.supabase\.co"/);
  assert.match(script, /base\.protocol !== "https:"/);
});

test("smoke runner performs only read-only function actions", () => {
  assert.match(script, /list_reviewers/);
  assert.match(script, /download_ticket/);
  assert.doesNotMatch(script, /assign_case|set_reviewer|revoke_case|upload_ticket|finalize_upload/);
  assert.doesNotMatch(script, /\.from\(["'][^"']+["']\)\.insert/);
});

test("smoke runner never prints tokens, keys, or response payloads", () => {
  assert.doesNotMatch(script, /console\.(log|error)\([^)]*(anonKey|userToken|adminToken|signedUrl|body\))/i);
  assert.match(script, /SUPABASE_ANON_KEY/);
  assert.match(script, /STAGING_ADMIN_ACCESS_TOKEN/);
  assert.match(script, /STAGING_USER_ACCESS_TOKEN/);
});

test("smoke runner verifies CORS, unauthenticated denial, and optional role boundaries", () => {
  for (const check of [
    "allows exact staging CORS preflight",
    "rejects an unapproved origin",
    "rejects unsupported GET requests",
    "denies unauthenticated request",
    "ordinary synthetic user is denied administrator API",
    "synthetic staging administrator can list reviewer control records",
  ]) assert.ok(script.includes(check), "Missing smoke check: " + check);
});
