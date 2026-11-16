"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "assets", "idea-auth.js"), "utf8");
const config = { mode: "supabase", url: "https://example.supabase.co", anonKey: "test-publishable-key" };

function loadAuth(authApi = {}) {
  let created = 0;
  const client = { auth: authApi };
  const window = {
    supabase: { createClient(url, key, options) { created++; return client; } }
  };
  vm.runInNewContext(source, { window, URL, Promise, Object, String, Number, Boolean, RegExp });
  return { auth: window.IDEALAB_AUTH, getCreated: () => created, client };
}

test("Auth xavfsiz offline holatdan boshlanadi va noto‘g‘ri konfiguratsiyada SDK yaratmaydi", () => {
  const { auth, getCreated } = loadAuth();
  assert.equal(auth.getStatus().mode, "offline-demo");
  const result = auth.configure({ mode: "supabase", url: "http://example.supabase.co", anonKey: "x" });
  assert.equal(result.ok, false);
  assert.equal(auth.getStatus().configured, false);
  assert.equal(getCreated(), 0);
});

test("Auth faqat HTTPS Supabase URL va publishable konfiguratsiya bilan ishga tushadi", () => {
  const { auth, getCreated } = loadAuth();
  const result = auth.configure(config);
  assert.equal(result.ok, true);
  assert.equal(auth.getStatus().configured, true);
  assert.equal(getCreated(), 1);
});

test("Auth login, session va logout holatlarini boshqaradi", async () => {
  const calls = [];
  let session = { user: { id: "user-a", email: "a@example.test" } };
  const { auth } = loadAuth({
    async signInWithPassword(payload) { calls.push(["login", payload]); return { data: { session }, error: null }; },
    async getSession() { return { data: { session }, error: null }; },
    async signOut() { session = null; return { data: {}, error: null }; }
  });
  auth.configure(config);
  const login = await auth.signIn("a@example.test", "long-password");
  assert.equal(login.ok, true);
  assert.equal(calls[0][0], "login");
  assert.equal(calls[0][1].email, "a@example.test");
  const current = await auth.getSession();
  assert.equal(current.ok, true);
  assert.equal(auth.getStatus().authenticated, true);
  const logout = await auth.signOut();
  assert.equal(logout.ok, true);
  assert.equal(auth.getStatus().authenticated, false);
});

test("Auth noto‘g‘ri parol va telefon formatini serverga yubormasdan rad etadi", async () => {
  let calls = 0;
  const { auth } = loadAuth({ async signInWithPassword() { calls++; return { data: {}, error: null }; } });
  auth.configure(config);
  const badLogin = await auth.signIn("not-an-email", "");
  const badPhone = await auth.sendPhoneSignupOtp("123");
  assert.equal(badLogin.ok, false);
  assert.equal(badPhone.ok, false);
  assert.equal(calls, 0);
});

test("authenticated profile data is read from the current Auth user metadata", async () => {
  const calls = [];
  const user = { id: "user-a", email: "a@example.test", user_metadata: { full_name: "Example User" } };
  const { auth } = loadAuth({
    async getSession() { return { data: { session: { user } }, error: null }; },
    async getUser() { calls.push("getUser"); return { data: { user }, error: null }; }
  });
  auth.configure(config);
  await auth.getSession();
  const result = await auth.getProfileData();
  assert.equal(result.ok, true);
  assert.equal(result.data.id, "user-a");
  assert.equal(result.data.metadata.full_name, "Example User");
  assert.deepEqual(calls, ["getUser"]);
});

test("profile updates write only bounded display metadata and never authorization claims", async () => {
  let payload;
  const user = { id: "user-a" };
  const { auth } = loadAuth({
    async getSession() { return { data: { session: { user } }, error: null }; },
    async updateUser(value) { payload = value; return { data: { user: { ...user, user_metadata: value.data } }, error: null }; }
  });
  auth.configure(config);
  await auth.getSession();
  const result = await auth.updateProfileData({
    fullName: " Example User ",
    phone: "+998901234567",
    bio: "Short bio",
    primaryGoal: "Learn",
    roles: ["founder"],
    skills: ["research", "design"],
    is_admin: true,
    service_role: "never"
  });
  assert.equal(result.ok, true);
  assert.equal(payload.data.full_name, "Example User");
  assert.equal(payload.data.profile_bio, "Short bio");
  assert.deepEqual(payload.data.profile_roles, ["founder"]);
  assert.deepEqual(payload.data.profile_skills, ["research", "design"]);
  assert.equal(Object.hasOwn(payload.data, "is_admin"), false);
  assert.equal(Object.hasOwn(payload.data, "service_role"), false);
});

test("profile metadata validation blocks oversized values before any Auth request", async () => {
  let calls = 0;
  const { auth } = loadAuth({
    async getSession() { return { data: { session: { user: { id: "user-a" } } }, error: null }; },
    async updateUser() { calls++; return { data: {}, error: null }; }
  });
  auth.configure(config);
  await auth.getSession();
  const result = await auth.updateProfileData({ bio: "x".repeat(2001) });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "INVALID_PROFILE");
  assert.equal(calls, 0);
});
