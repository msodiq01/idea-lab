"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
  path.join(__dirname, "..", "assets", "idea-profile-bridge.js"),
  "utf8"
);

function loadBridge() {
  const window = {};
  vm.runInNewContext(source, { window, console }, { filename: "idea-profile-bridge.js" });
  return window.IDEALAB_PROFILE_BRIDGE;
}

test("identity bridge requires both profile and session readers", () => {
  const result = loadBridge().inspect();
  assert.equal(result.ok, false);
  assert.equal(result.state, "unavailable");
  assert.equal(result.reason, "DEPENDENCIES_MISSING");
});

test("identity bridge reports when no legacy profile exists", () => {
  const result = loadBridge().inspect({
    readLegacyProfile: () => null,
    readSession: () => ({ user: { id: "auth-1" } })
  });
  assert.equal(result.ok, true);
  assert.equal(result.state, "no-legacy-profile");
  assert.equal(result.proposal, null);
});

test("identity bridge requires sign-in before proposing a review", () => {
  const result = loadBridge().inspect({
    readLegacyProfile: () => ({ id: "legacy-1", email: "same@example.com" }),
    readSession: () => null
  });
  assert.equal(result.ok, true);
  assert.equal(result.state, "sign-in-required");
  assert.equal(result.proposal, null);
});

test("matching email never counts as legacy ownership proof or links identities", () => {
  const result = loadBridge().inspect({
    readLegacyProfile: () => ({ id: "legacy-1", email: "same@example.com", roles: ["admin"] }),
    readSession: () => ({ user: { id: "auth-1", email: "same@example.com" } })
  });
  assert.equal(result.state, "ready-for-explicit-review");
  assert.equal(result.proposal.legacyOwnershipVerified, false);
  assert.equal(result.proposal.requiresLegacyOwnershipProof, true);
  assert.equal(result.proposal.requiresExplicitConfirmation, true);
  assert.equal(result.proposal.rolesTransferred, false);
  assert.equal(result.proposal.profileDataTransferred, false);
  assert.equal(result.proposal.identityEvidence, "authenticated-session-only");
});

test("identity bridge proposal is immutable and inspection does not mutate legacy data", () => {
  const profile = { id: "legacy-2", email: "old@example.com", displayName: "Legacy User" };
  const snapshot = JSON.stringify(profile);
  const result = loadBridge().inspect({
    readLegacyProfile: () => profile,
    readSession: () => ({ user: { id: "auth-2", email: "new@example.com" } })
  });
  assert.equal(Object.isFrozen(result.proposal), true);
  assert.equal(JSON.stringify(profile), snapshot);
  assert.equal(result.proposal.legacyEmailPresent, true);
  assert.equal(result.proposal.authenticatedEmailPresent, true);
});

test("inspection failures are contained without exposing thrown details", () => {
  const result = loadBridge().inspect({
    readLegacyProfile: () => { throw new Error("private storage detail"); },
    readSession: () => null
  });
  assert.equal(result.ok, false);
  assert.equal(result.state, "unavailable");
  assert.equal(result.reason, "INSPECTION_FAILED");
  assert.equal(JSON.stringify(result).includes("private storage detail"), false);
});
