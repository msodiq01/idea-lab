#!/usr/bin/env node
"use strict";

/*
 * Read-only staging smoke checks for supplier verification Edge Functions.
 * No rows, files, reviewers, assignments, or administrator records are created.
 *
 * Required local environment:
 *   STAGING_CONFIRM=YES
 *   SUPABASE_URL=https://<staging-project-ref>.supabase.co
 *   STAGING_PROJECT_REF=<same project ref>
 *   SUPABASE_ANON_KEY=<public anon/publishable key>
 *   STAGING_ALLOWED_ORIGIN=https://<exact-staging-frontend-origin>
 *
 * Optional:
 *   STAGING_USER_ACCESS_TOKEN=<synthetic ordinary-user access token>
 *   STAGING_ADMIN_ACCESS_TOKEN=<synthetic staging-admin access token>
 *
 * Never commit a populated .env file or paste tokens into chat/issues.
 */

const required = ["SUPABASE_URL", "STAGING_PROJECT_REF", "SUPABASE_ANON_KEY", "STAGING_ALLOWED_ORIGIN"];
const missing = required.filter((key) => !process.env[key]);
if (missing.length || process.env.STAGING_CONFIRM !== "YES") {
  console.error("Staging smoke test stopped. Set required local environment values and STAGING_CONFIRM=YES.");
  if (missing.length) console.error("Missing:", missing.join(", "));
  process.exit(2);
}

const base = new URL(process.env.SUPABASE_URL);
const projectRef = process.env.STAGING_PROJECT_REF.trim();
const origin = process.env.STAGING_ALLOWED_ORIGIN.trim();
if (base.protocol !== "https:" || base.hostname !== projectRef + ".supabase.co" || base.username || base.password) {
  console.error("Staging smoke test stopped: SUPABASE_URL must match the declared HTTPS staging project ref.");
  process.exit(2);
}
const parsedOrigin = new URL(origin);
if (parsedOrigin.protocol !== "https:" || parsedOrigin.origin !== origin) {
  console.error("Staging smoke test stopped: STAGING_ALLOWED_ORIGIN must be an exact HTTPS origin.");
  process.exit(2);
}

const anonKey = process.env.SUPABASE_ANON_KEY;
const userToken = process.env.STAGING_USER_ACCESS_TOKEN || "";
const adminToken = process.env.STAGING_ADMIN_ACCESS_TOKEN || "";
const results = [];

async function request(functionName, { method = "POST", action, token = "", requestOrigin = origin, contentType = "application/json" } = {}) {
  const headers = { apikey: anonKey, origin: requestOrigin };
  if (token) headers.authorization = "Bearer " + token;
  if (method === "OPTIONS") {
    headers["access-control-request-method"] = "POST";
    headers["access-control-request-headers"] = "authorization, apikey, content-type, x-client-info";
  } else if (contentType) {
    headers["content-type"] = contentType;
  }
  const response = await fetch(base.origin + "/functions/v1/" + functionName, {
    method,
    headers,
    body: method === "POST" ? JSON.stringify(action ? { action } : {}) : undefined,
    redirect: "manual",
  });
  return response;
}

async function check(name, fn) {
  try {
    const response = await fn();
    const passed = response.passed;
    results.push({ name, passed, detail: response.detail || "" });
    console.log((passed ? "PASS " : "FAIL ") + name + (response.detail ? " — " + response.detail : ""));
  } catch (error) {
    results.push({ name, passed: false, detail: error instanceof Error ? error.message : "request failed" });
    console.log("FAIL " + name + " — request failed");
  }
}

await check("admin function allows exact staging CORS preflight", async () => {
  const r = await request("supplier-verification-admin", { method: "OPTIONS" });
  return { passed: r.status === 204 && r.headers.get("access-control-allow-origin") === origin && (r.headers.get("access-control-allow-headers") || "").includes("authorization"), detail: "HTTP " + r.status };
});

await check("evidence function allows exact staging CORS preflight", async () => {
  const r = await request("supplier-verification-evidence", { method: "OPTIONS" });
  return { passed: r.status === 204 && r.headers.get("access-control-allow-origin") === origin && (r.headers.get("access-control-allow-headers") || "").includes("authorization"), detail: "HTTP " + r.status };
});


await check("admin function rejects unsupported GET requests", async () => {
  const r = await request("supplier-verification-admin", { method: "GET" });
  return { passed: r.status === 405, detail: "HTTP " + r.status };
});

await check("evidence function rejects unsupported GET requests", async () => {
  const r = await request("supplier-verification-evidence", { method: "GET" });
  return { passed: r.status === 405, detail: "HTTP " + r.status };
});

const unapprovedOrigin = "https://invalid-staging-origin.example";
await check("admin function rejects an unapproved origin", async () => {
  const r = await request("supplier-verification-admin", { method: "OPTIONS", requestOrigin: unapprovedOrigin });
  return { passed: r.status === 403, detail: "HTTP " + r.status };
});

await check("evidence function rejects an unapproved origin", async () => {
  const r = await request("supplier-verification-evidence", { method: "OPTIONS", requestOrigin: unapprovedOrigin });
  return { passed: r.status === 403, detail: "HTTP " + r.status };
});

await check("admin function denies unauthenticated request", async () => {
  const r = await request("supplier-verification-admin", { action: "list_reviewers" });
  return { passed: r.status === 401, detail: "HTTP " + r.status };
});

await check("evidence function denies unauthenticated request", async () => {
  const r = await request("supplier-verification-evidence", { action: "download_ticket" });
  return { passed: r.status === 401, detail: "HTTP " + r.status };
});

if (userToken) {
  await check("ordinary synthetic user is denied administrator API", async () => {
    const r = await request("supplier-verification-admin", { action: "list_reviewers", token: userToken });
    return { passed: r.status === 403, detail: "HTTP " + r.status };
  });
} else {
  console.log("SKIP ordinary-user authorization check — STAGING_USER_ACCESS_TOKEN not set");
}

if (adminToken) {
  await check("synthetic staging administrator can list reviewer control records", async () => {
    const r = await request("supplier-verification-admin", { action: "list_reviewers", token: adminToken });
    const body = r.status === 200 ? await r.json() : null;
    return { passed: r.status === 200 && body && Array.isArray(body.reviewers), detail: "HTTP " + r.status };
  });
} else {
  console.log("SKIP administrator authorization check — STAGING_ADMIN_ACCESS_TOKEN not set");
}

if (userToken) {
  await check("authenticated caller is rejected when evidence ID is missing", async () => {
    const r = await request("supplier-verification-evidence", {
      action: "download_ticket",
      token: userToken,
    });
    // Missing evidenceId is a validation error; no data is created or read.
    return { passed: r.status === 400, detail: "HTTP " + r.status };
  });
} else {
  console.log("SKIP authenticated evidence validation — STAGING_USER_ACCESS_TOKEN not set");
}

const failed = results.filter((item) => !item.passed);
console.log("\nSmoke checks: " + results.filter((item) => item.passed).length + " passed, " + failed.length + " failed.");
if (failed.length) process.exitCode = 1;
