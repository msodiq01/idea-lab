"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const schema = fs.readFileSync(path.join(root, "supabase", "schema.sql"), "utf8");
const hardening = fs.readFileSync(
  path.join(root, "supabase", "migrations", "20261115_security_hardening.sql"),
  "utf8"
);

function compact(sql) {
  return sql.replace(/--[^\n]*/g, " ").replace(/\s+/g, " ").toLowerCase();
}

const normalizedSchema = compact(schema);
const normalizedHardening = compact(hardening);

test("core application tables all enable row-level security", () => {
  const tables = [
    "profiles", "projects", "teams", "job_posts", "specialist_profiles",
    "offers", "investors", "resources", "project_investment_applications",
    "team_applications", "job_applications", "offer_applications",
    "offer_messages", "resource_orders", "project_members", "project_tasks",
    "project_updates", "events", "event_registrations",
  ];

  for (const table of tables) {
    assert.match(
      normalizedSchema,
      new RegExp("alter table public\\." + table + " enable row level security"),
      "RLS is not enabled for " + table
    );
  }
});

test("public directory views use security barriers and expose only approved projections", () => {
  const views = {
    projects_public: ["id", "name", "direction", "description", "investment", "specialists", "resources", "owner_name", "status", "created_at", "updated_at"],
    teams_public: ["id", "project_id", "name", "direction", "leader", "roles", "description", "created_at"],
    job_posts_public: ["id", "company_name", "job_title", "description", "salary", "location", "job_type", "status", "created_at"],
    specialist_profiles_public: ["id", "full_name", "profession", "skills", "experience", "education", "about", "portfolio", "job_search", "created_at"],
    offers_public: ["id", "title", "offer_type", "category", "location", "deadline", "status", "description", "created_at"],
    investors_public: ["id", "name", "investor_type", "direction", "amount", "location", "website", "description", "status", "created_at"],
    resources_public: ["id", "title", "category", "description", "location", "price", "status", "created_at"],
  };

  for (const [view, columns] of Object.entries(views)) {
    const match = normalizedHardening.match(
      new RegExp("create or replace view public\\." + view + " with \\(security_barrier = true, security_invoker = false\\) as select ([\\s\\S]*?) from public\\.")
    );
    assert.ok(match, "Missing protected view definition: " + view);
    for (const column of columns) {
      assert.ok(
        match[1].split(",").some((item) => item.trim() === column),
        view + " is missing approved column " + column
      );
    }
    for (const privateColumn of ["owner_id", "owner_email", "owner_phone", "phone", "email", "telegram", "resume_path", "contact"]) {
      assert.ok(
        !match[1].split(",").some((item) => item.trim() === privateColumn),
        view + " unexpectedly exposes " + privateColumn
      );
    }
  }
});

test("public directory views are authenticated read-only surfaces", () => {
  const views = [
    "projects_public", "teams_public", "job_posts_public",
    "specialist_profiles_public", "offers_public", "investors_public", "resources_public",
  ];

  for (const view of views) {
    assert.ok(
      normalizedHardening.includes("revoke all on public." + view + " from anon"),
      "Anonymous access is not revoked for " + view
    );
    assert.ok(
      normalizedHardening.includes("grant select on public." + view + " to authenticated"),
      "Authenticated SELECT grant is missing for " + view
    );
  }
  assert.doesNotMatch(normalizedHardening, /grant\s+(insert|update|delete|all)\s+on\s+public\.[a-z_]+_public\s+to\s+authenticated/);
});

test("role changes are blocked for authenticated profile updates", () => {
  assert.match(normalizedHardening, /create or replace function public\.prevent_self_role_escalation/);
  assert.match(normalizedHardening, /new\.roles is distinct from old\.roles/);
  assert.match(normalizedHardening, /before update of roles on public\.profiles/);
  assert.match(normalizedHardening, /raise exception 'profile roles can only be changed by a trusted administrator'/);
});

test("application inserts bind applicant identity to auth.uid and validate target status", () => {
  const policies = [
    { table: "project_investment_applications", identity: "investor_user_id", target: "p.status in ('active', 'published')" },
    { table: "team_applications", identity: "applicant_id", target: "select 1 from public.teams t where t.id = team_id" },
    { table: "job_applications", identity: "applicant_id", target: "j.status = 'active'" },
    { table: "offer_applications", identity: "applicant_id", target: "o.status = 'active'" },
    { table: "resource_orders", identity: "requester_id", target: "r.status = 'active'" },
  ];

  for (const item of policies) {
    const start = normalizedHardening.indexOf("create policy \"authenticated users can", normalizedHardening.indexOf("on public." + item.table));
    assert.notEqual(start, -1, "Missing authenticated insert policy for " + item.table);
    const end = normalizedHardening.indexOf(";", start);
    const policy = normalizedHardening.slice(start, end);
    assert.ok(policy.includes(item.identity + " = auth.uid()"), item.table + " does not bind identity to auth.uid()");
    assert.ok(policy.includes(item.target), item.table + " does not validate its target");
  }
});

test("task identity guard prevents project and creator changes by ordinary users", () => {
  assert.match(normalizedHardening, /create or replace function public\.guard_project_task_identity/);
  assert.match(normalizedHardening, /new\.project_id is distinct from old\.project_id/);
  assert.match(normalizedHardening, /new\.created_by is distinct from old\.created_by/);
  assert.match(normalizedHardening, /before update on public\.project_tasks/);
  assert.match(normalizedHardening, /only the project owner can reassign a task/);
});
