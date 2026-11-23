"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const htmlFiles=fs.readdirSync(root).filter(file=>file.endsWith(".html"));
const html=file=>fs.readFileSync(path.join(root,file),"utf8");

test("HTML files have unique IDs",()=>{
 for(const file of htmlFiles){
  const ids=[...html(file).matchAll(/\b id=["']([^"']+)["']/g)].map(match=>match[1]);
  const duplicates=ids.filter((id,index)=>ids.indexOf(id)!==index);
  assert.deepEqual([...new Set(duplicates)],[],file+" contains duplicate IDs");
 }
});

test("local script, stylesheet and link references resolve",()=>{
 for(const file of htmlFiles){
  const source=html(file);
  for(const match of source.matchAll(/\b(?:src|href)=["']([^"']+)["']/g)){
   const ref=match[1];
   if(/^(https?:|mailto:|tel:|data:|javascript:|#)/i.test(ref))continue;
   const clean=ref.split(/[?#]/)[0];
   if(!clean)continue;
   const target=path.resolve(root,path.dirname(file),clean);
   assert.ok(target.startsWith(root+path.sep)||target===root,"reference escapes repository: "+file+" -> "+ref);
   assert.ok(fs.existsSync(target),file+" has missing local reference: "+ref);
  }
 }
});

test("core pages use shared shell assets",()=>{
 const core=["index.html","dashboard.html","projects.html","profile.html","teams.html"];
 for(const file of core){
  const source=html(file);
  assert.ok(source.includes("assets/idea-shell.css"),file+" missing shared shell stylesheet");
  assert.ok(source.includes("assets/idea-shell.js"),file+" missing shared shell script");
 }
});
