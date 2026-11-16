"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const page = fs.readFileSync(path.join(root, "project-workspace.html"), "utf8");
const dashboard = fs.readFileSync(path.join(root, "dashboard.html"), "utf8");

test("project workspace is reachable from the main dashboard", () => {
  assert.match(dashboard, /href="project-workspace\.html"/);
  assert.match(page, /Loyiha va jamoa ish maydoni/);
});

test("workspace uses only the reviewed fixed IDEA LAB command gateway", () => {
  for (const method of ["createProject", "updateProject", "requestProjectMembership", "reviewProjectMembership", "leaveProject"]) {
    assert.match(page, new RegExp("data\\." + method + "\\("));
  }
  assert.doesNotMatch(page, /\.from\(["'](?:projects|project_members)["']\)/);
  assert.doesNotMatch(page, /\.insert\(|\.update\(|\.delete\(/);
});

test("workspace remains inert in offline-demo and does not submit user data locally", () => {
  assert.match(page, /mode==="supabase"/);
  assert.match(page, /button\.disabled=true/);
  assert.match(page, /offline-demo rejimida/);
  assert.doesNotMatch(page, /localStorage|sessionStorage/);
});

test("workspace does not include privileged credentials or accept owner identity", () => {
  assert.doesNotMatch(page, /service_role|serviceRole|secret_key|database_password/i);
  assert.doesNotMatch(page, /p_created_by|p_user_id|ownerId/);
  assert.match(page, /auth\.uid\(\)/);
});

test("all forms expose accessible labels and status feedback", () => {
  for (const id of ["createProjectForm", "updateProjectForm", "joinProjectForm", "reviewMembershipForm"]) {
    assert.match(page, new RegExp('id="' + id + '"'));
  }
  assert.match(page, /aria-live="polite"/);
  assert.match(page, /required minlength="3" maxlength="160"/);
});
