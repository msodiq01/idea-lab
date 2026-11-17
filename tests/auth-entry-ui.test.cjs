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

test("password reset redirect preserves the repository subpath on project hosting", () => {
  assert.match(html, /new URL\("auth\.html",window\.location\.href\)\.toString\(\)/);
  assert.doesNotMatch(html, /window\.location\.origin\+"\/auth\.html"/);
});

test("Auth entry page requires both public config and SDK before enabling actions", () => {
  assert.match(html, /window\.IDEALAB_CONFIG&&window\.supabase&&auth\.configure/);
  assert.match(html, /setEnabled\(false\)/);
  assert.match(html, /setEnabled\(true\)/);
});

test("all credential submissions are guarded by configured Auth state", () => {
  const guarded = (html.match(/if\(!configured\|\|button\.disabled\)return;/g) || []).length;
  assert.equal(guarded, 1);
  assert.match(html, /withSubmitLock\(button,async\(\)=>/);
});

test("phone SMS signup and login controls are present and use the guarded adapter", () => {
  assert.match(html, /data-channel="phone"/);
  assert.match(html, /id="phoneNumber"/);
  assert.match(html, /id="phoneCode"/);
  assert.match(html, /auth\.sendPhoneSignupOtp\(phone\)/);
  assert.match(html, /auth\.sendPhoneLoginOtp\(phone\)/);
  assert.match(html, /auth\.verifyPhoneOtp\(phone/);
  assert.match(html, /if\(!configured\)return;/);
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

test("Auth page loads the read-only identity bridge and never claims a completed link", () => {
  assert.match(html, /assets\/idea-core\.js/);
  assert.match(html, /assets\/idea-profile-bridge\.js/);
  assert.match(html, /IDEALAB_PROFILE_BRIDGE\.inspect/);
  assert.match(html, /Bog‘lash hali bajarilmagan/);
  assert.match(html, /rol ko‘chirilmagan/);
});

test("Auth page exposes guarded session navigation and sign-out controls", () => {
  assert.match(html, /id="profileLink" href="profile\.html" aria-disabled="true"/);
  assert.match(html, /id="signOutButton" type="button" disabled/);
  assert.match(html, /auth\.signOut\(\)/);
  assert.match(html, /updateSessionControls\(session\)/);
  assert.match(html, /if\(!configured\|\|signOutButton\.disabled\)return/);
});

test("offline mode keeps session controls unavailable", () => {
  assert.match(html, /updateSessionControls\(null\);/);
  assert.match(html, /signOutButton\.disabled=!configured\|\|!active/);
});


test("Auth entry page prevents duplicate submissions and validates email domains before provider calls", () => {
  assert.match(html, /async function withSubmitLock\(button,action\)/);
  assert.match(html, /button\.disabled=true;button\.textContent="Kutilmoqda…"/);
  assert.match(html, /finally\{button\.disabled=false;button\.textContent=original\}/);
  assert.match(html, /"gamil\.com":"gmail\.com"/);
  assert.match(html, /emailRedirectTo:new URL\("auth\.html",window\.location\.href\)\.toString\(\)/);
});

test("Auth page hides phone OTP while the Supabase phone provider is not enabled", () => {
  assert.match(html, /const phoneTab=document\.querySelector\('\[data-channel="phone"\]'\);if\(phoneTab\)phoneTab\.hidden=true/);
  assert.match(html, /\.tab\[hidden\]\{display:none!important\}/);
});


test("Auth provider guidance is domain-agnostic and reused for login, signup, reset and phone errors", () => {
  assert.match(html, /function formatAuthError\(error\)/);
  assert.match(html, /jo‘natuvchi domeni va SMTP\/API sozlamalarini tekshirishi kerak/);
  assert.doesNotMatch(html, /idealab\.uz|Resend’da/);
  assert.match(html, /auth\.signIn\([\s\S]*?formatAuthError\(result\.error\)/);
  assert.match(html, /auth\.signUp\([\s\S]*?formatAuthError\(result\.error\)/);
  assert.match(html, /auth\.resetPassword\([\s\S]*?formatAuthError\(result\.error\)/);
  assert.match(html, /auth\.sendPhoneSignupOtp\(phone\)[\s\S]*?formatAuthError\(result\.error\)/);
});
