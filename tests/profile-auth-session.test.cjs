"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const profile = fs.readFileSync(path.join(__dirname, "../profile.html"), "utf8");

test("profile page exposes a safe Auth session panel with offline defaults", () => {
  assert.match(profile, /id="authSessionPanel"/);
  assert.match(profile, /id="refreshAuthSession"/);
  assert.match(profile, /id="profileSignOut" disabled/);
  assert.match(profile, /assets\/idea-auth\.js/);
  assert.match(profile, /Auth serveri ulanmagan/);
});

test("profile Auth controls refresh session and guard sign-out", () => {
  assert.match(profile, /authAdapter\.getSession\(\)/);
  assert.match(profile, /authAdapter\.signOut\(\)/);
  assert.match(profile, /if \(!authAdapter \|\| profileSignOutButton\.disabled\) return/);
  assert.match(profile, /profileSignOutButton\.disabled = !configured \|\| !active/);
  const scripts = [...profile.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  assert.doesNotThrow(() => new vm.Script(scripts[0][1]));
});

test("profile page never automatically links local profile data to Auth", () => {
  assert.match(profile, /eski brauzer profilingizni avtomatik bog‘lamaydi/);
  assert.doesNotMatch(profile, /legacyProfileId\s*=\s*.*authUserId/);
});
