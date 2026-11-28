"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const html = fs.readFileSync(path.join(__dirname, "..", "projects.html"), "utf8");
const scriptStart = html.indexOf("function createProjectCard(project)");
const scriptEnd = html.indexOf("/* SEARCH AND FILTER */", scriptStart);
const cardSource = html.slice(scriptStart, scriptEnd);

test("project cards render user-controlled display fields with textContent", () => {
  for (const field of ["getDirection(project)", "getProjectName(project)", "getDescription(project)", "ownerName"]) {
    assert.ok(cardSource.includes(field), "card source should use " + field);
  }
  assert.match(cardSource, /category\.textContent\s*=\s*getDirection\(project\)/);
  assert.match(cardSource, /title\.textContent\s*=\s*getProjectName\(project\)/);
  assert.match(cardSource, /description\.textContent\s*=\s*getDescription\(project\)/);
  assert.match(cardSource, /owner\.textContent\s*=/);
  assert.doesNotMatch(cardSource, /innerHTML\s*=/);
});

test("project detail navigation encodes project identifiers", () => {
  assert.match(cardSource, /encodeURIComponent\(String\(project\.slug\)\)/);
  assert.match(cardSource, /encodeURIComponent\(String\(projectId\)\)/);
  assert.match(cardSource, /project-detail\.html\?slug=/);
  assert.match(cardSource, /project-detail\.html\?id=/);
});

test("project cards use semantic article elements and build links with DOM APIs", () => {
  assert.match(cardSource, /document\.createElement\("article"\)/);
  assert.match(cardSource, /document\.createElement\("a"\)/);
  assert.match(cardSource, /card\.appendChild\(link\)/);
});
