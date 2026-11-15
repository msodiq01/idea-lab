"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

test("Global shell provides a skip link and a stable main-content target",()=>{
 const shell=read("assets/idea-shell.js");
 assert.match(shell,/il-skip-link/);
 assert.match(shell,/Asosiy kontentga o‘tish/);
 assert.match(shell,/#il-main-content/);
 assert.match(shell,/document\.querySelector\("main"\)/);
});
test("Navigation uses semantic landmarks and descriptive labels",()=>{
 const shell=read("assets/idea-shell.js");
 assert.match(shell,/<nav class="il-links" aria-label="Asosiy yo‘nalishlar">/);
 assert.match(shell,/aria-label="IDEA LAB asosiy navigatsiyasi"/);
 assert.match(shell,/aria-current="page"/);
});
test("All sections remain reachable from the grouped menu",()=>{
 const shell=read("assets/idea-shell.js");
 for(const name of ["Dashboard","Arizalar markazi","Tashkilotlar","Loyihalar","Talab va taklif","Investorlar","Mutaxassislar","Yo‘l xaritasi"]) assert.ok(shell.includes(name),name);
});
test("Grouped menu closes on outside click, navigation, and Escape",()=>{
 const shell=read("assets/idea-shell.js");
 assert.match(shell,/menu\.open=false/);
 assert.match(shell,/event\.key==="Escape"/);
 assert.match(shell,/summary\.focus\(\)/);
 assert.match(shell,/event\.target\.closest\("a"\)/);
});
test("Legacy navigation is hidden without deleting page content",()=>{
 const shell=read("assets/idea-shell.js");
 assert.match(shell,/classList\.add\("il-legacy-nav-shell"\)/);
 assert.doesNotMatch(shell,/legacyShell\.remove\(\)/);
});
test("Keyboard focus is visible and the skip link is reachable",()=>{
 const css=read("assets/idea-shell.css");
 assert.match(css,/\.il-skip-link:focus/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/outline-offset:3px/);
});
test("Mobile navigation targets remain touch-friendly",()=>{
 const css=read("assets/idea-shell.css");
 assert.match(css,/@media\(max-width:1000px\)/);
 assert.match(css,/min-height:42px/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/max-height:70vh/);
});
test("Reduced-motion preference is respected",()=>{
 const css=read("assets/idea-shell.css");
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/scroll-behavior:auto/);
});
test("Every core page loads the shared navigation and design system",()=>{
 for(const page of ["index.html","dashboard.html","profile.html","projects.html","marketplace.html","teams.html","investors.html","specialists.html","organizations.html","offers.html","exchange.html","roadmap.html","applications.html"]){
  const html=read(page);
  assert.match(html,/assets\/idea-shell\.css/,page);
  assert.match(html,/assets\/idea-shell\.js/,page);
 }
});
test("Navigation labels and active-page state are not replaced with inert controls",()=>{
 const shell=read("assets/idea-shell.js");
 assert.match(shell,/href="index\.html"/);
 assert.match(shell,/href="exchange\.html"/);
 assert.match(shell,/isCurrent\(url\)/);
});
