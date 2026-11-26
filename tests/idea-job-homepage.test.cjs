"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.join(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
test("homepage makes IDEA JOB the primary product", () => {
  const page = read("index.html");
  assert.match(page, /id="idea-job-priority"/);
  assert.match(page, /Ish izlayapman/);
  assert.match(page, /Xodim izlayapman/);
  assert.match(page, /career\.html#career-section/);
  assert.ok(page.indexOf('id="idea-job-priority"') < page.indexOf('id="ecosystem-map"'));
});
test("GSAP motion layer is loaded on homepage and career centre", () => {
  for (const page of [read("index.html"), read("career.html")]) {
    assert.match(page, /gsap@3\.13\.0/);
    assert.match(page, /assets\/idea-motion\.js/);
  }
  assert.match(read("assets/idea-motion.js"), /prefers-reduced-motion/);
});
test("job experience stylesheet is shared between homepage and career centre", () => {
  for (const file of ["index.html", "career.html"]) assert.match(read(file), /assets\/idea-job-experience\.css/);
});

test("clarity-first visual system is shared and accessible", () => {
  for (const file of ["index.html", "career.html"]) {
    assert.match(read(file), /assets\/idea-visual-system\.css/);
  }
  const styles = read("assets/idea-visual-system.css");
  assert.match(styles, /:focus-visible/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /--il-copy:#d3deed/);
  assert.match(styles, /--il-white:#f7faff/);
});

test("career server module parses and its submit handler supports async operations", () => {
  const source = read("assets/idea-careers-server.js");
  assert.doesNotThrow(() => new vm.Script(source));
  assert.match(source, /document\.addEventListener\("submit",\s*async\s+event\s*=>/);
});

test("shared IDEA LAB logo is wired into homepage and IDEA JOB header", () => {
  const logo = read("assets/idea-lab-logo.svg");
  assert.ok(logo.includes('viewBox="0 0 240 64"'));
  assert.ok(logo.includes("<title id=") && logo.includes(">IDEA LAB</title>"));
  for (const file of ["index.html", "career.html"]) {
    const page = read(file);
    assert.ok(page.includes('rel="icon" type="image/svg+xml" href="assets/idea-lab-logo.svg"'), file + " must use the shared favicon");
    assert.ok(page.includes('<img src="assets/idea-lab-logo.svg" alt="IDEA LAB">'), file + " must use the shared header logo");
  }
});

test("career document head has no literal escaped newline before favicon", () => {
  const page = read("career.html");
  assert.ok(page.includes("</title>\n<link rel=\"icon\""), "favicon must begin on a real new line");
  assert.ok(!page.includes("</title>\\n<link rel=\"icon\""), "literal backslash-n must not appear in HTML");
});
