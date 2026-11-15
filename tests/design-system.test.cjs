"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("Global shell has one responsive primary navigation and no repeated metric strip", () => {
  const shell = read("assets/idea-shell.js");
  assert.match(shell, /id="il-global"/);
  assert.match(shell, /class="il-links"/);
  assert.match(shell, /Barcha bo‘limlar/);
  assert.match(shell, /Demo rejim/);
  assert.match(shell, /Yo‘l xaritasi/);
  assert.doesNotMatch(shell, /il-metrics/);
});

test("Legacy navigation is hidden without deleting page content wrappers", () => {
  const shell = read("assets/idea-shell.js");
  assert.match(shell, /body > header\.navbar, body > header\.header/);
  assert.match(shell, /classList\.add\("il-legacy-nav-shell"\)/);
  assert.doesNotMatch(shell, /legacyShell\.remove\(\)/);
});

test("Global design system contains responsive SaaS tokens and mobile layouts", () => {
  const css = read("assets/idea-shell.css");
  assert.match(css, /--il-primary:#5146e5/);
  assert.match(css, /--il-surface:#fff/);
  assert.match(css, /@media\(max-width:640px\)/);
  assert.match(css, /prefers-reduced-motion/);
});

test("Core pages load the shared design system and shell", () => {
  for (const page of ["index.html","dashboard.html","profile.html","projects.html","marketplace.html","teams.html","investors.html","specialists.html","organizations.html","offers.html","exchange.html","roadmap.html"]) {
    const html = read(page);
    assert.match(html, /assets\/idea-shell\.css/, page + " should load global CSS");
    assert.match(html, /assets\/idea-shell\.js/, page + " should load global shell");
  }
});

test("Future roadmap is reachable and clearly separates current demo from planned work", () => {
  const home = read("index.html");
  const roadmap = read("roadmap.html");
  assert.ok(home.includes("href=\"roadmap.html\""));
  assert.equal((home.match(/class="feature-card module-card planned"/g) || []).length, 15);
  assert.equal((home.match(/href="roadmap.html"/g) || []).length, 16);
  assert.match(roadmap, /Mavjud platforma yo‘nalishlari/);
  assert.match(roadmap, /Yagona ekotizim poydevori/);
  assert.match(roadmap, /Iqtisodiyot, savdo va infratuzilma/);
  assert.match(roadmap, /Ta’lim, jamiyat va hamkorlik/);
  assert.match(roadmap, /Aqlli texnologiyalar va global kengayish/);
  assert.match(roadmap, /status-plan/);
  assert.ok(roadmap.includes("Demo / cheklangan"));
  assert.match(roadmap, /aniq muddat va ishga tushirish sanasi tasdiqlanmagan/);
});
