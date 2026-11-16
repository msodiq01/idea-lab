"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "profile.html"), "utf8");

test("profile page loads Supabase SDK and public config before the auth adapter", () => {
  const sdk = html.indexOf('src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/dist/umd/supabase.min.js"');
  const config = html.indexOf('src="assets/idea-config.js"');
  const adapter = html.indexOf('src="assets/idea-auth.js"');
  assert.ok(sdk >= 0, "Supabase browser SDK must be loaded");
  assert.ok(config > sdk, "public config must load after the SDK");
  assert.ok(adapter > config, "auth adapter must load after config");
});

test("profile page configures its auth adapter before checking the session", () => {
  assert.match(html, /authAdapter\.configure\(window\.IDEALAB_CONFIG,\s*window\.supabase\)/);
  assert.match(html, /async function refreshAuthSession/);
  assert.match(html, /authAdapter\.getSession\(\)/);
});
