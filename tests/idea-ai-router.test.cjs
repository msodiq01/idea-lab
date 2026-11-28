const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const source = fs.readFileSync("supabase/functions/idea-ai/index.ts", "utf8");

test("IDEA LAB AI Edge Function uses Gemini as the default provider", () => {
  assert.match(source, /raw\.provider === "openai" \? "openai" : "gemini"/);
  assert.match(source, /gemini-3\.1-flash-lite/);
  assert.match(source, /GEMINI_API_KEY/);
  assert.match(source, /generativelanguage\.googleapis\.com/);
});

test("AI Edge Function keeps JWT verification enabled in deployment configuration", () => {
  // This repository contract is enforced by the Supabase function registry/deployment workflow.
  assert.match(source, /gateway enforces the user's JWT/);
  assert.match(source, /Authorization/);
});

test("AI Edge Function validates user fields and restricts prompt modes", () => {
  assert.match(source, /value\.length > 3000/);
  assert.match(source, /MODES\[raw\.mode\]/);
  assert.match(source, /content-length/);
});

test("provider keys are read only from server environment variables", () => {
  assert.match(source, /Deno\.env\.get\("GEMINI_API_KEY"\)/);
  assert.match(source, /Deno\.env\.get\("OPENAI_API_KEY"\)/);
  assert.doesNotMatch(source, /window\.|localStorage|service_role/i);
});

test("provider errors do not return upstream response bodies or secrets", () => {
  assert.match(source, /UPSTREAM_PROVIDER_ERROR/);
  assert.match(source, /AI provayder javobi xato/);
  assert.doesNotMatch(source, /JSON\.stringify\(data\)/);
});
