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

test("profile loads current Auth metadata when no legacy browser profile exists", () => {
  assert.match(html, /authAdapter\.getProfileData\(\)/);
  assert.match(html, /if\(!profile&&authAdapter/);
  assert.match(html, /authUserId:remote\.data\.id/);
});

test("legacy profile is never silently attached to a different Auth account", () => {
  assert.match(html, /Never auto-attach an existing browser-only profile/);
  assert.match(html, /window\.confirm\("Ushbu brauzerdagi eski profil ma’lumotlarini/);
  assert.match(html, /previousProfile\.authUserId!==sessionUserId/);
});

test("profile save reports whether authenticated cloud synchronization succeeded", () => {
  assert.match(html, /authAdapter\.updateProfileData\(profile\)/);
  assert.match(html, /Mahalliy profil saqlandi, ammo server bilan sinxronlanmadi/);
  assert.match(html, /Profil server akkauntingizga va ushbu brauzerga saqlandi/);
});

test("profile metadata sync stores no avatar data and is user-editable display data only", () => {
  const auth = fs.readFileSync(path.join(__dirname, "..", "assets", "idea-auth.js"), "utf8");
  assert.match(auth, /user-editable display metadata only/);
  assert.match(auth, /profile_roles/);
  assert.match(auth, /profile_skills/);
  assert.doesNotMatch(auth, /avatarData/);
});

test("profile page inline JavaScript remains syntactically valid", () => {
  const vm = require("node:vm");
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  assert.ok(scripts.length > 0);
  for (const source of scripts) assert.doesNotThrow(() => new vm.Script(source));
});
