"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const authSource = fs.readFileSync(path.join(root, "assets/idea-auth.js"), "utf8");
const dataSource = fs.readFileSync(path.join(root, "assets/idea-data.js"), "utf8");
const config = { mode: "supabase", url: "https://sample-project.supabase.co", anonKey: "public-anon-key" };

function load(options = {}) {
  const calls = [];
  const client = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
    },
    schema(name) {
      calls.push({ method: "schema", name });
      return {
        from(view) {
          calls.push({ method: "from", view });
          const query = {
            select(columns) { calls.push({ method: "select", columns }); return query; },
            order(column, config) { calls.push({ method: "order", column, config }); return query; },
            limit(value) { calls.push({ method: "limit", value }); return query; },
            eq(column, value) { calls.push({ method: "eq", column, value }); return query; },
            then(resolve, reject) {
              return Promise.resolve(options.response || { data: options.data || [], error: null }).then(resolve, reject);
            }
          };
          return query;
        }
      };
    }
  };
  const sdk = { createClient: () => client };
  const context = { console, URL, Promise, globalThis: null };
  context.window = context;
  context.globalThis = context;
  context.supabase = sdk;
  vm.runInNewContext(authSource, context);
  vm.runInNewContext(dataSource, context);
  if (options.configure !== false) context.IDEALAB_AUTH.configure(config, sdk);
  return { api: context.IDEALAB_DATA, auth: context.IDEALAB_AUTH, calls };
}

test("data gateway stays unavailable in offline mode and never issues requests", async () => {
  const { api, calls } = load({ configure: false });
  assert.equal(api.getStatus().configured, false);
  const result = await api.listPublicProjects();
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "BACKEND_NOT_CONFIGURED");
  assert.equal(calls.length, 0);
});

test("public project catalogue reads only the reviewed invoker view", async () => {
  const { api, calls } = load({ data: [{ slug: "sample", title: "Sample" }] });
  const result = await api.listPublicProjects({ limit: 12 });
  assert.equal(result.ok, true);
  assert.equal(result.data[0].slug, "sample");
  assert.deepEqual(calls.map(call => call.name || call.view || call.method), ["schema", "public_project_directory", "select", "order", "limit"]);
  assert.equal(calls[0].name, "idea_app");
  assert.equal(calls.at(-1).value, 12);
});

test("catalogue limits are bounded and invalid limits use the safe default", async () => {
  const first = load();
  await first.api.listPublicSpecialists({ limit: 10000 });
  assert.equal(first.calls.at(-1).value, 50);
  const second = load();
  await second.api.listPublicResources({ limit: "not-a-number" });
  assert.equal(second.calls.at(-1).value, 20);
});

test("project update query validates slug before making a request", async () => {
  const { api, calls } = load();
  const bad = await api.listProjectUpdates("../private");
  assert.equal(bad.error.code, "INVALID_PROJECT_SLUG");
  assert.equal(calls.length, 0);
  const good = await api.listProjectUpdates("sample-project");
  assert.equal(good.ok, true);
  assert.ok(calls.some(call => call.method === "eq" && call.column === "project_slug" && call.value === "sample-project"));
});

test("specialist, resource and partnership catalogues use only fixed safe views", async () => {
  const { api, calls } = load();
  await api.listPublicSpecialists();
  await api.listPublicResources();
  await api.listPublicPartnerships();
  assert.deepEqual(calls.filter(call => call.method === "from").map(call => call.view), [
    "public_specialist_directory",
    "public_resource_catalogue",
    "public_partnership_directory"
  ]);
});

test("provider errors are normalized without leaking database details", async () => {
  const { api } = load({ response: { data: null, error: { message: "private SQL schema detail" } } });
  const result = await api.listPublicProjects();
  assert.equal(result.ok, false);
  assert.equal(result.error.code, "DATA_REQUEST_FAILED");
  assert.equal(result.error.message.includes("SQL"), false);
});

test("data gateway exposes no generic table or mutation methods", () => {
  const { api } = load();
  assert.equal(typeof api.from, "undefined");
  assert.equal(typeof api.insert, "undefined");
  assert.equal(typeof api.update, "undefined");
  assert.equal(typeof api.delete, "undefined");
});
