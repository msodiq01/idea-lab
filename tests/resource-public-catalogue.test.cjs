"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "resources.html"), "utf8");

test("resource page keeps local inventory separate from public server catalogue", () => {
  assert.match(html, /ideaLabResourceRegistry/);
  assert.match(html, /Platformadagi ochiq resurs takliflari/);
  assert.match(html, /Mahalliy inventar yozuvlari serverga yuborilmaydi/);
  assert.match(html, /listPublicResources\(\{limit:50\}\)/);
});

test("public resource cards are rendered using textContent, not untrusted HTML", () => {
  assert.match(html, /title\.textContent=String\(row\.title/);
  assert.match(html, /detail\.textContent=/);
  assert.match(html, /list\.replaceChildren\(\)/);
  assert.doesNotMatch(html, /list\.innerHTML\s*=.*row/);
});

test("resource page loads Supabase dependencies before configuring the data gateway", () => {
  const sdk = html.indexOf('src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0/dist/umd/supabase.min.js"');
  const config = html.indexOf('src="assets/idea-config.js"');
  const auth = html.indexOf('src="assets/idea-auth.js"');
  const data = html.indexOf('src="assets/idea-data.js"');
  assert.ok(sdk >= 0 && config > sdk && auth > config && data > auth);
  assert.match(html, /auth\.configure\(window\.IDEALAB_CONFIG,window\.supabase\)/);
});
