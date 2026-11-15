"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadAuth(sdk) {
  const context = { console, URL, Promise, globalThis: null };
  context.window = context;
  context.globalThis = context;
  if (sdk) context.supabase = sdk;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../assets/idea-auth.js"), "utf8"), context);
  return context.IDEALAB_AUTH;
}
const config = { mode: "supabase", url: "https://sample-project.supabase.co", anonKey: "public-anon-key" };

test("offline default never pretends the user is authenticated", () => {
  const auth = loadAuth();
  assert.deepEqual(JSON.parse(JSON.stringify(auth.getStatus())), {
    mode: "offline-demo", configured: false, authenticated: false, reason: "BACKEND_NOT_CONFIGURED"
  });
});
test("offline methods fail safely without contacting a backend", async () => {
  const auth = loadAuth();
  const result = await auth.signIn("person@example.com", "password123");
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "BACKEND_NOT_CONFIGURED");
});
test("missing and invalid configuration cannot initialize Supabase", () => {
  let calls = 0;
  const sdk = { createClient() { calls++; return { auth: {} }; } };
  const auth = loadAuth(sdk);
  assert.equal(auth.configure({ mode: "supabase", url: "http://insecure.test", anonKey: "x" }, sdk).ok, false);
  assert.equal(auth.configure({ mode: "offline-demo", url: config.url, anonKey: config.anonKey }, sdk).ok, false);
  assert.equal(calls, 0);
});
test("valid public configuration initializes SDK once", () => {
  let calls = 0;
  const sdk = { createClient(url, key, options) {
    calls++;
    assert.equal(url, config.url);
    assert.equal(key, config.anonKey);
    assert.equal(options.auth.persistSession, true);
    return { auth: { getSession: async () => ({ data: { session: null }, error: null }) } };
  } };
  const auth = loadAuth(sdk);
  assert.equal(auth.configure(config, sdk).ok, true);
  assert.equal(calls, 1);
  assert.equal(auth.getStatus().mode, "supabase");
});
test("sign up rejects short passwords before SDK invocation", async () => {
  let calls = 0;
  const sdk = { createClient: () => ({ auth: { signUp: async () => { calls++; return { data: {} }; } } }) };
  const auth = loadAuth(sdk);
  auth.configure(config, sdk);
  const result = await auth.signUp("a@example.com", "short");
  assert.equal(result.error.code, "INVALID_CREDENTIALS");
  assert.equal(calls, 0);
});
test("sign in delegates to signInWithPassword and returns safe data", async () => {
  let received;
  const sdk = { createClient: () => ({ auth: {
    signInWithPassword: async input => { received = input; return { data: { user: { id: "auth-uid" } }, error: null }; }
  } }) };
  const auth = loadAuth(sdk);
  auth.configure(config, sdk);
  const result = await auth.signIn(" person@example.com ", "password123");
  assert.equal(result.ok, true);
  assert.equal(received.email, "person@example.com");
  assert.equal(result.data.user.id, "auth-uid");
});
test("provider errors are normalized and do not leak raw details", async () => {
  const sdk = { createClient: () => ({ auth: {
    signInWithPassword: async () => ({ data: null, error: { message: "private SQL detail" } })
  } }) };
  const auth = loadAuth(sdk);
  auth.configure(config, sdk);
  const result = await auth.signIn("a@example.com", "password123");
  assert.equal(result.error.code, "AUTH_REQUEST_FAILED");
  assert.equal(result.error.message.includes("SQL"), false);
});
test("auth state callback receives session and updates authentication status", () => {
  const sdk = { createClient: () => ({ auth: {
    onAuthStateChange: callback => {
      callback("SIGNED_IN", { user: { id: "auth-uid" } });
      return { data: { subscription: { unsubscribe() {} } } };
    }
  } }) };
  const auth = loadAuth(sdk);
  auth.configure(config, sdk);
  let eventName = "";
  const result = auth.onAuthStateChange(event => { eventName = event.event; });
  assert.equal(result.ok, true);
  assert.equal(eventName, "SIGNED_IN");
  assert.equal(auth.getStatus().authenticated, true);
});


test("password reset validates email before calling provider", async () => {
  let calls = 0;
  const sdk = { createClient: () => ({ auth: {
    resetPasswordForEmail: async () => { calls++; return { data: {}, error: null }; }
  } }) };
  const auth = loadAuth(sdk);
  auth.configure(config, sdk);
  const bad = await auth.resetPassword("not-an-email");
  assert.equal(bad.error.code, "INVALID_EMAIL");
  assert.equal(calls, 0);
  const good = await auth.resetPassword("person@example.com");
  assert.equal(good.ok, true);
  assert.equal(calls, 1);
});

test("password reset accepts only secure redirect destinations", async () => {
  let received;
  const sdk = { createClient: () => ({ auth: {
    resetPasswordForEmail: async (email, options) => {
      received = { email, options };
      return { data: {}, error: null };
    }
  } }) };
  const auth = loadAuth(sdk);
  auth.configure(config, sdk);
  const bad = await auth.resetPassword("person@example.com", "http://example.com/reset");
  assert.equal(bad.error.code, "INVALID_REDIRECT");
  const good = await auth.resetPassword("person@example.com", "https://app.example.com/reset");
  assert.equal(good.ok, true);
  assert.equal(received.options.redirectTo, "https://app.example.com/reset");
});

test("password update requires an authenticated session and a strong-enough length", async () => {
  let calls = 0;
  const sdk = { createClient: () => ({ auth: {
    updateUser: async () => { calls++; return { data: {}, error: null }; },
    onAuthStateChange: callback => {
      callback("SIGNED_IN", { user: { id: "auth-uid" } });
      return { data: { subscription: { unsubscribe() {} } } };
    }
  } }) };
  const auth = loadAuth(sdk);
  auth.configure(config, sdk);
  assert.equal((await auth.updatePassword("newpass123")).error.code, "AUTH_REQUIRED");
  auth.onAuthStateChange(() => {});
  assert.equal((await auth.updatePassword("short")).error.code, "INVALID_CREDENTIALS");
  assert.equal((await auth.updatePassword("newpass123")).ok, true);
  assert.equal(calls, 1);
});

test("sign out clears local adapter authentication status after provider success", async () => {
  const sdk = { createClient: () => ({ auth: {
    signOut: async () => ({ data: {}, error: null }),
    onAuthStateChange: callback => {
      callback("SIGNED_IN", { user: { id: "auth-uid" } });
      return { data: { subscription: { unsubscribe() {} } } };
    }
  } }) };
  const auth = loadAuth(sdk);
  auth.configure(config, sdk);
  auth.onAuthStateChange(() => {});
  assert.equal(auth.getStatus().authenticated, true);
  assert.equal((await auth.signOut()).ok, true);
  assert.equal(auth.getStatus().authenticated, false);
});

test("auth state subscription exposes a safe unsubscribe helper", () => {
  let unsubscribed = false;
  const sdk = { createClient: () => ({ auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() { unsubscribed = true; } } } })
  } }) };
  const auth = loadAuth(sdk);
  auth.configure(config, sdk);
  const listener = auth.onAuthStateChange(() => {});
  listener.unsubscribe();
  assert.equal(unsubscribed, true);
});
