"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const html = fs.readFileSync(path.join(__dirname, "../auth.html"), "utf8");

test("Auth entry page keeps credential controls disabled in offline mode", () => {
  assert.match(html, /Backend hali ulanmagan/);
  assert.match(html, /id="loginEmail"[^>]*disabled/);
  assert.match(html, /id="loginPassword"[^>]*disabled/);
  assert.match(html, /id="signupSubmit"[^>]*disabled/);
  assert.match(html, /id="resetSubmit"[^>]*disabled/);
});

test("Auth entry page requires both public config and SDK before enabling actions", () => {
  assert.match(html, /window\.IDEALAB_CONFIG&&window\.supabase&&auth\.configure/);
  assert.match(html, /setEnabled\(false\)/);
  assert.match(html, /setEnabled\(true\)/);
});

test("all credential submissions are guarded by configured Auth state", () => {
  const guarded = (html.match(/if\(!configured\)return;/g) || []).length;
  assert.equal(guarded, 3);
});

test("inline Auth UI JavaScript parses without syntax errors", () => {
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.length, 1);
  assert.doesNotThrow(() => new vm.Script(scripts[0][1]));
});

test("Auth entry page links back to the platform and profile navigation exposes it", () => {
  assert.match(html, /href="index\.html"/);
  const profile = fs.readFileSync(path.join(__dirname, "../profile.html"), "utf8");
  const index = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  assert.match(profile, /href="auth\.html">Kirish/);
  assert.match(index, /href="auth\.html">Kirish/);
});
