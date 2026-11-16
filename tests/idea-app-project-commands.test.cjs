"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const sql = fs.readFileSync(
  path.join(root, "supabase/migrations/20261116150000_idea_app_project_member_commands.sql"),
  "utf8"
);
const executableSql = sql.replace(/--.*$/gm, "");

test("membership and task command migration is draft-only and additive", () => {
  assert.match(sql, /NOT applied to any Supabase project/i);
  assert.doesNotMatch(executableSql, /alter\s+table\s+public\./i);
  assert.doesNotMatch(executableSql, /drop\s+(table|schema|function)/i);
  assert.doesNotMatch(executableSql, /create\s+table\s+public\./i);
});

test("membership transition trigger runs as invoker with empty search_path", () => {
  assert.match(sql, /function idea_private\.enforce_project_member_transition\(\)[\s\S]*?security invoker[\s\S]*?set search_path = ''/i);
  assert.match(sql, /create trigger project_members_guard_transition/i);
  assert.match(sql, /Membership identity and invitation fields are immutable/i);
});

test("invite acceptance is limited to the invited user and cannot change role", () => {
  const start = sql.indexOf("-- The invited user may accept or decline their own invitation.");
  const end = sql.indexOf("-- Project owner or active manager", start);
  const section = sql.slice(start, end);
  assert.match(section, /v_actor = old\.user_id/i);
  assert.match(section, /old\.membership_status = 'invited'/i);
  assert.match(section, /new\.membership_status in \('active', 'declined'\)/i);
  assert.match(section, /new\.membership_role = old\.membership_role/i);
});

test("managers cannot elevate or change roles while approving requests", () => {
  assert.match(sql, /v_is_manager and not v_is_owner/i);
  assert.match(sql, /new\.membership_role not in \('contributor', 'viewer'\)/i);
  assert.match(sql, /Managers cannot assign or change membership roles/i);
});

test("only owner can change role of an active member", () => {
  assert.match(sql, /elsif v_is_owner[\s\S]*?old\.membership_status = 'active'[\s\S]*?new\.membership_role in \('manager', 'contributor', 'viewer'\)/i);
});

test("membership updates use narrow column grants and explicit RLS", () => {
  assert.match(sql, /grant update \(membership_role, membership_status, joined_at, updated_at\)[\s\S]*?on idea_app\.project_members to authenticated/i);
  assert.match(sql, /create policy project_members_update_owner_manager/i);
  assert.match(sql, /create policy project_members_update_self/i);
  assert.doesNotMatch(executableSql, /grant\s+all\s+on\s+idea_app\.project_members/i);
});

test("task assignee must be project owner or active project member", () => {
  assert.match(sql, /function idea_private\.validate_project_task_assignee\(\)[\s\S]*?security invoker[\s\S]*?set search_path = ''/i);
  assert.match(sql, /Task assignee must be the project owner or an active project member/i);
  assert.match(sql, /create trigger project_tasks_validate_assignee/i);
  assert.match(sql, /function idea_private\.is_valid_project_task_assignee\([\s\S]*?security definer[\s\S]*?set search_path = ''/i);
  assert.match(sql, /auth\.uid\(\)/i);
  assert.match(sql, /pg_catalog\.pg_trigger_depth\(\) > 0/i);
  assert.match(sql, /grant execute on function idea_private\.is_valid_project_task_assignee\(uuid, uuid\)\s+to authenticated/i);
});

test("task assignee validation avoids client access to private owner and roster columns", () => {
  const triggerStart = sql.indexOf("function idea_private.validate_project_task_assignee()");
  const triggerEnd = sql.indexOf("$function$;", triggerStart) + 11;
  const trigger = sql.slice(triggerStart, triggerEnd);
  assert.match(trigger, /idea_private\.is_valid_project_task_assignee\(new\.project_id, new\.assignee_id\)/i);
  assert.doesNotMatch(trigger, /select p\.created_by|select 1 from idea_app\.project_members/i);

  const policyStart = sql.indexOf("create policy project_tasks_update_owner_manager");
  const policyEnd = sql.indexOf(";", policyStart);
  const policy = sql.slice(policyStart, policyEnd);
  assert.match(policy, /has_active_project_role\(project_id, array\['manager'\]/i);
  assert.doesNotMatch(policy, /select p\.created_by|select 1 from idea_app\.project_members/i);
});

test("only owner or manager can assign tasks to other active members", () => {
  assert.match(sql, /create policy project_tasks_update_owner_manager[\s\S]*?for update to authenticated/i);
  assert.match(sql, /has_active_project_role\(project_id, array\['manager'\]::text\[\]\)/i);
  assert.match(sql, /grant update \([\s\S]*?assignee_id, updated_at[\s\S]*?on idea_app\.project_tasks to authenticated/i);
});

test("only the private assignee lookup is SECURITY DEFINER; command triggers are invoker", () => {
  const definerMatches = executableSql.match(/security definer/gi) || [];
  assert.equal(definerMatches.length, 1);
  assert.match(sql, /function idea_private\.enforce_project_member_transition\(\)[\s\S]*?security invoker/i);
  assert.match(sql, /function idea_private\.validate_project_task_assignee\(\)[\s\S]*?security invoker/i);
});

test("schema usage is separate from Data API exposure and table privileges", () => {
  assert.match(sql, /grant usage on schema idea_app to authenticated/i);
  assert.doesNotMatch(executableSql, /grant\s+(select|insert|delete|all)\s+on\s+idea_app\./i);
  assert.doesNotMatch(executableSql, /alter\s+publication|pgrst\.db_schemas/i);
});
