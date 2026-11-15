"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadBridge() {
  const context = { window: null, globalThis: null };
  context.window = context;
  context.globalThis = context;
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "../assets/idea-profile-bridge.js"), "utf8"),
    context
  );
  return context.IDEALAB_PROFILE_BRIDGE;
}

test("missing dependencies fail closed", () => {
  const result = loadBridge().inspect({});
  assert.equal(result.ok, false);
  assert.equal(result.reason, "DEPENDENCIES_MISSING");
});

test("legacy profile without id is not linkable", () => {
  const result = loadBridge().inspect({
    readLegacyProfile: () => ({ fullName: "Demo" }),
    readSession: () => ({ user: { id: "auth-uid" } })
  });
  assert.equal(result.state, "no-legacy-profile");
  assert.equal(result.proposal, null);
});

test("a valid legacy profile still requires an authenticated session", () => {
  const result = loadBridge().inspect({
    readLegacyProfile: () => ({ id: "legacy-1" }),
    readSession: () => null
  });
  assert.equal(result.state, "sign-in-required");
  assert.equal(result.proposal, null);
});

test("proposal uses Auth UID and legacy ID without email-based matching", () => {
  const result = loadBridge().inspect({
    readLegacyProfile: () => ({ id: "legacy-1", email: "old@example.com", roles: ["Investor"] }),
    readSession: () => ({ user: { id: "auth-uid", email: "different@example.com" } })
  });
  assert.equal(result.state, "ready-for-explicit-review");
  assert.equal(result.proposal.legacyProfileId, "legacy-1");
  assert.equal(result.proposal.authUserId, "auth-uid");
  assert.equal(result.proposal.requiresExplicitConfirmation, true);
  assert.equal(result.proposal.rolesTransferred, false);
  assert.equal(result.proposal.profileDataTransferred, false);
  assert.equal("email" in result.proposal, false);
});

test("inspection never writes or mutates legacy profile/session objects", () => {
  const profile = { id: "legacy-1", email: "a@example.com", roles: ["Investor"] };
  const session = { user: { id: "auth-uid", email: "a@example.com" } };
  const beforeProfile = JSON.stringify(profile);
  const beforeSession = JSON.stringify(session);
  const result = loadBridge().inspect({
    readLegacyProfile: () => profile,
    readSession: () => session
  });
  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(profile), beforeProfile);
  assert.equal(JSON.stringify(session), beforeSession);
});

test("malformed array profiles are rejected", () => {
  const result = loadBridge().inspect([profile], session, configured);
  assert.equal(result.state, "legacy_profile_missing");
  assert.equal(result.canLink, false);
});
