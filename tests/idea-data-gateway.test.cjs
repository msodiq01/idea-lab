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
        rpc(name, args) {
          calls.push({ method: "rpc", name, args });
          return Promise.resolve(options.rpcResponse || { data: options.rpcData || "123e4567-e89b-42d3-a456-426614174000", error: null });
        },
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
  client.rpc = (name, args) => {
    calls.push({ method: "rpc", name, args });
    return Promise.resolve(options.rpcResponse || { data: options.rpcData || "123e4567-e89b-42d3-a456-426614174000", error: null });
  };
  client.from = (view) => {
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
  assert.deepEqual(calls.map(call => call.name || call.view || call.method), ["idea_lab_public_project_directory", "select", "order", "limit"]);
  assert.equal(calls[0].view, "idea_lab_public_project_directory");
  assert.equal(calls.at(-1).value, 12);
});

test("public project details resolve by validated slug without exposing internal UUIDs", async () => {
  const { api, calls } = load({ data: [{ slug: "sample-project", title: "Sample" }] });
  const bad = await api.getPublicProjectBySlug("../private");
  assert.equal(bad.error.code, "INVALID_PROJECT_SLUG");
  assert.equal(calls.length, 0);
  const good = await api.getPublicProjectBySlug("sample-project");
  assert.equal(good.ok, true);
  assert.equal(good.data.slug, "sample-project");
  assert.deepEqual(calls.filter(x => ["from", "eq", "limit"].includes(x.method)).map(x => x.method), ["from", "eq", "limit"]);
  assert.equal(calls.find(x => x.method === "eq").value, "sample-project");
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
    "idea_lab_public_specialist_directory",
    "idea_lab_public_resource_catalogue",
    "idea_lab_public_partnership_directory"
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

test("dashboard loads the guarded data gateway but uses the live public Supabase configuration", () => {
  const dashboard = fs.readFileSync(path.join(root, "dashboard.html"), "utf8");
  const config = fs.readFileSync(path.join(root, "assets/idea-config.js"), "utf8");
  assert.ok(dashboard.includes("supabase-js@2.119.0"));
  assert.ok(dashboard.includes("assets/idea-config.js"));
  assert.ok(dashboard.includes("assets/idea-auth.js"));
  assert.ok(dashboard.includes("assets/idea-data.js"));
  assert.ok(dashboard.includes('config.mode === "supabase"'));
  assert.ok(config.includes('mode: "supabase"'));
  assert.ok(config.includes("sb_publishable_"));
});


test("project creation calls only the fixed invoker command and never accepts an owner ID", async () => {
  const { api, calls } = load();
  const invalid = await api.createProject({ title: "x" });
  assert.equal(invalid.error.code, "INVALID_PROJECT_TITLE");
  assert.equal(calls.length, 0);
  const result = await api.createProject({ title: "My project", summary: "Summary" });
  assert.equal(result.ok, true);
  const call = calls.find(item => item.method === "rpc");
  assert.equal(call.name, "idea_lab_create_project");
  assert.equal(call.args.p_title, "My project");
  assert.equal(call.args.p_summary, "Summary");
  assert.equal(Object.hasOwn(call.args, "p_created_by"), false);
  assert.equal(Object.hasOwn(call.args, "p_user_id"), false);
});

test("public project publishing validates ownership command inputs and calls a fixed RPC", async () => {
  const { api, calls } = load();
  const bad = await api.publishProjectListing({ projectId: "bad", slug: "sample", title: "Valid title", summary: "Valid summary" });
  assert.equal(bad.error.code, "INVALID_PROJECT_ID");
  assert.equal(calls.length, 0);
  const projectId = "123e4567-e89b-42d3-a456-426614174000";
  const good = await api.publishProjectListing({
    projectId, slug: "sample-project", title: "Sample project", summary: "A public project summary", category: "technology"
  });
  assert.equal(good.ok, true);
  const call = calls.find(item => item.method === "rpc");
  assert.equal(call.name, "idea_lab_publish_project_listing");
  assert.equal(call.args.p_project_id, projectId);
  assert.equal(call.args.p_slug, "sample-project");
  assert.equal(call.args.p_category, "technology");
});

test("project edit and team actions use fixed RPC names and validated identifiers", async () => {
  const { api, calls } = load();
  const projectId = "123e4567-e89b-42d3-a456-426614174000";
  const membershipId = "123e4567-e89b-42d3-a456-426614174001";
  const bad = await api.updateProject({ projectId: "not-a-uuid", title: "Valid title" });
  assert.equal(bad.error.code, "INVALID_PROJECT_ID");
  assert.equal(calls.length, 0);
  await api.updateProject({ projectId, title: "Valid title" });
  await api.requestProjectMembership(projectId);
  await api.reviewProjectMembership({ membershipId, approve: true, role: "contributor" });
  await api.leaveProject(membershipId);
  assert.deepEqual(calls.filter(item => item.method === "rpc").map(item => item.name), [
    "idea_lab_update_project",
    "idea_lab_request_project_membership",
    "idea_lab_review_project_membership",
    "idea_lab_leave_project"
  ]);
  const review = calls.find(item => item.name === "idea_lab_review_project_membership");
  assert.equal(review.args.p_membership_role, "contributor");
});

test("project command migration uses invoker functions and grants no broad table access", () => {
  const sql = fs.readFileSync(path.join(root, "supabase/migrations/20261116190000_idea_app_project_commands.sql"), "utf8");
  assert.equal((sql.match(/security invoker/gi) || []).length, 6);
  assert.equal((sql.match(/set search_path = ''/gi) || []).length, 5);
  assert.match(sql, /revoke all on function idea_app\.create_project/);
  assert.match(sql, /grant execute on function idea_app\.create_project/);
  assert.match(sql, /grant select \(id\) on idea_app\.projects/);
  assert.doesNotMatch(sql, /security definer/i);
  assert.doesNotMatch(sql, /grant all on all tables/i);
  assert.match(sql, /request_project_membership/);
  assert.match(sql, /review_project_membership/);
  assert.match(sql, /leave_project/);
});


test("project applications validate input and use only the server-owned submit command", async () => {
  const { api, calls } = load();
  const bad = await api.submitProjectApplication({ projectId: "bad", message: "", amount: -1 });
  assert.equal(bad.error.code, "INVALID_PROJECT_ID");
  assert.equal(calls.length, 0);
  const projectId = "123e4567-e89b-42d3-a456-426614174000";
  const result = await api.submitProjectApplication({
    projectId, message: "Investor taklifi", amount: 2500000, currency: "uzs"
  });
  assert.equal(result.ok, true);
  const call = calls.find(item => item.method === "rpc");
  assert.equal(call.name, "submit_project_application");
  assert.equal(call.args.p_project_id, projectId);
  assert.equal(call.args.p_applicant_note, "Investor taklifi");
  assert.equal(call.args.p_offer_amount, 2500000);
  assert.equal(call.args.p_currency_code, "UZS");
  assert.equal(Object.hasOwn(call.args, "p_applicant_id"), false);
  assert.equal(Object.hasOwn(call.args, "p_owner_id"), false);
});

test("slug-based project application validates fields and calls only the server resolver", async () => {
  const { api, calls } = load();
  const bad = await api.submitProjectApplicationBySlug({ projectSlug: "../private", message: "Offer", amount: 1000 });
  assert.equal(bad.error.code, "INVALID_PROJECT_SLUG");
  assert.equal(calls.length, 0);
  const result = await api.submitProjectApplicationBySlug({
    projectSlug: "sample-project", message: "Investor taklifi", amount: 2500000, currency: "uzs"
  });
  assert.equal(result.ok, true);
  const call = calls.find(item => item.method === "rpc");
  assert.equal(call.name, "submit_project_application_by_slug");
  assert.equal(call.args.p_project_slug, "sample-project");
  assert.equal(call.args.p_applicant_note, "Investor taklifi");
  assert.equal(call.args.p_offer_amount, 2500000);
  assert.equal(call.args.p_currency_code, "UZS");
  assert.equal(Object.hasOwn(call.args, "p_project_id"), false);
});

test("application centre reads only the participant-filtered server view", async () => {
  const { api, calls } = load({ data: [{ id: "application-1", source_type: "project" }] });
  const result = await api.listApplicationCenter({ limit: 80 });
  assert.equal(result.ok, true);
  assert.equal(calls.find(item => item.method === "from").view, "application_center");
  assert.equal(calls.find(item => item.method === "limit").value, 50);
  assert.equal(calls.some(item => item.method === "rpc"), false);
});

test("project application status updates validate allowed server transitions", async () => {
  const { api, calls } = load();
  const applicationId = "123e4567-e89b-42d3-a456-426614174000";
  const bad = await api.updateProjectApplication({ applicationId, status: "admin" });
  assert.equal(bad.error.code, "INVALID_APPLICATION_STATUS");
  assert.equal(calls.length, 0);
  const good = await api.updateProjectApplication({ applicationId, status: "accepted" });
  assert.equal(good.ok, true);
  const call = calls.find(item => item.method === "rpc");
  assert.equal(call.name, "update_project_application");
  assert.equal(call.args.p_application_id, applicationId);
  assert.equal(call.args.p_status, "accepted");
});

test("application migration uses invoker views, participant RLS and auth-derived identities", () => {
  const sql = fs.readFileSync(path.join(root, "supabase/migrations/20261116200000_idea_app_application_center.sql"), "utf8");
  assert.match(sql, /security invoker/i);
  assert.match(sql, /select auth\.uid\(\)/i);
  assert.match(sql, /submit_project_application/);
  assert.match(sql, /update_project_application/);
  assert.match(sql, /create or replace view public\.application_center/i);
  assert.match(sql, /public\.submit_project_application/i);
  assert.match(sql, /public\.update_project_application/i);
  assert.match(sql, /union all/i);
  assert.match(sql, /revoke all on function/);
  assert.doesNotMatch(sql, /security definer/i);
});

test("homepage creates server projects and offers an explicit public listing choice", () => {
  const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.ok(home.includes("IDEALAB_DATA.createProject"));
  assert.ok(home.includes("IDEALAB_DATA.publishProjectListing"));
  assert.ok(home.includes('id="publishToCatalog"'));
  assert.ok(home.includes("listPublicProjects"));
  assert.ok(home.includes("IDEALAB_AUTH.getSession"));
});

test("project catalogue and detail page use live public slugs for server projects", () => {
  const catalogue = fs.readFileSync(path.join(root, "projects.html"), "utf8");
  const detail = fs.readFileSync(path.join(root, "project-detail.html"), "utf8");
  assert.ok(catalogue.includes("listPublicProjects"));
  assert.ok(catalogue.includes("project-detail.html?slug="));
  assert.ok(detail.includes("getPublicProjectBySlug"));
  assert.ok(detail.includes("submitProjectApplicationBySlug"));
  assert.ok(detail.includes("projectSlug: projectSlug"));
  assert.ok(detail.includes("if (backendConfigured)"));
});

test("project detail and Applications Centre activate real storage only from explicit Supabase config", () => {
  const detail = fs.readFileSync(path.join(root, "project-detail.html"), "utf8");
  const centre = fs.readFileSync(path.join(root, "applications.html"), "utf8");
  assert.ok(detail.includes("assets/idea-config.js"));
  assert.ok(detail.includes("assets/idea-auth.js"));
  assert.ok(detail.includes("assets/idea-data.js"));
  assert.ok(detail.includes("submitProjectApplication"));
  assert.ok(centre.includes("listApplicationCenter"));
  assert.ok(centre.includes('IDEALAB_CONFIG.mode==="supabase"'));
});


test("account page offers separate Supabase sign-up and sign-in with live public backend config", () => {
  const account = fs.readFileSync(path.join(root, "account.html"), "utf8");
  const config = fs.readFileSync(path.join(root, "assets/idea-config.js"), "utf8");
  assert.ok(account.includes("IDEALAB_AUTH.signUp"));
  assert.ok(account.includes("IDEALAB_AUTH.signIn"));
  assert.ok(account.includes("IDEALAB_AUTH.signOut"));
  assert.ok(config.includes('mode: "supabase"'));
  assert.ok(config.includes("sb_publishable_"));
  assert.doesNotMatch(config, /service_role\\s*[:=]|secret_key\\s*[:=]|database_password\\s*[:=]/i);
});
