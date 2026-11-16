const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const shellCss = fs.readFileSync(path.join(root, "assets/idea-shell.css"), "utf8");
const shellJs = fs.readFileSync(path.join(root, "assets/idea-shell.js"), "utf8");

test("premium design layer includes responsive and reduced-motion support", () => {
  assert.ok(shellCss.includes("IDEA LAB Premium Experience"));
  assert.ok(shellCss.includes("#il-global .il-brand"));
  assert.ok(shellCss.includes("@media(max-width:640px)"));
  assert.ok(shellCss.includes("prefers-reduced-motion:reduce"));
});

test("global shell reports partial backend integration honestly", () => {
  assert.ok(shellJs.includes("Server ulangan · ayrim bo‘limlar demo"));
  assert.ok(shellJs.includes("Bu sahifada server ulanishi tasdiqlanmadi"));
});

test("authentication page keeps its dedicated header without duplicate app navigation", () => {
  assert.ok(shellJs.includes('if(current==="auth.html") return;'));
});

test("quick create action points to the real project form anchor", () => {
  assert.ok(shellJs.includes("index.html#create-project"));
});

test("all application pages share the shell stylesheet and navigation script", () => {
  const pages = fs.readdirSync(root).filter((name) => name.endsWith(".html") && name !== "auth.html");
  assert.ok(pages.length >= 30, "expected the platform page inventory to be present");
  for (const page of pages) {
    const html = fs.readFileSync(path.join(root, page), "utf8");
    assert.ok(html.includes("assets/idea-shell.css"), page + " must load the shared design system");
    assert.ok(html.includes("assets/idea-shell.js"), page + " must load shared navigation");
  }
});

test("specialist vacancy route points to the actual vacancy section", () => {
  const specialists = fs.readFileSync(path.join(root, "specialists.html"), "utf8");
  const teams = fs.readFileSync(path.join(root, "teams.html"), "utf8");
  assert.ok(specialists.includes("teams.html#career-section"));
  assert.ok(teams.includes('id="career-section"'));
  assert.ok(!specialists.includes("jobs.html"));
});

test("homepage workflow has a bright card layout with pill navigation and no left stripe", () => {
  const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.match(home, /G‘oyadan natijagacha — bitta izchil yo‘l/);
  assert.match(home, /\.workflow-step[\s\S]*border-radius:22px/);
  assert.match(home, /\.workflow-note[\s\S]*border-left:1px solid/);
  assert.match(home, /\.workflow-link[\s\S]*border-radius:999px/);
});

test("project creation collects goals, support needs and validates private PDF evidence", () => {
  const home = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const gateway = fs.readFileSync(path.join(root, "assets/idea-data.js"), "utf8");
  for (const id of ["projectGoal", "requiredSupport", "legalDocs"]) assert.ok(home.includes('id="' + id + '"'));
  assert.match(home, /uploadProjectLegalDocuments/);
  assert.match(gateway, /idea-project-legal-documents/);
  assert.match(gateway, /10 \* 1024 \* 1024/);
  assert.match(gateway, /auth\.getUser\(\)/);
});
