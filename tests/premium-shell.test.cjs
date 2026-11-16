const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const shellCss = fs.readFileSync(path.join(root, "assets/idea-shell.css"), "utf8");
const shellJs = fs.readFileSync(path.join(root, "assets/idea-shell.js"), "utf8");

test("premium design layer includes responsive and reduced-motion support", () => {
  assert.match(shellCss, /IDEA LAB Premium Experience/);
  assert.match(shellCss, /#il-global \\.il-brand/);
  assert.match(shellCss, /@media\\(max-width:640px\\)/);
  assert.match(shellCss, /prefers-reduced-motion:reduce/);
});

test("global shell reports partial backend integration honestly", () => {
  assert.match(shellJs, /Server ulangan · ayrim bo‘limlar demo/);
  assert.match(shellJs, /Bu sahifada server ulanishi tasdiqlanmadi/);
});

test("authentication page keeps its dedicated header without duplicate app navigation", () => {
  assert.match(shellJs, /if\\(current==="auth\\.html"\\) return;/);
});

test("quick create action points to the real project form anchor", () => {
  assert.match(shellJs, /index\\.html#create-project/);
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
  assert.match(specialists, /teams\\.html#career-section/);
  assert.match(teams, /id=["']career-section["']/);
  assert.doesNotMatch(specialists, /jobs\\.html/);
});
