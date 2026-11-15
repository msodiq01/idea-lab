"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

test("About page explains the IDEA LAB mission, objectives and ecosystem",()=>{
 const page=read("about.html");
 for(const phrase of ["G‘oyadan","Asosiy maqsad","Kelajak tasavvuri","G‘oyalarni jamlash","Loyihalarni rivojlantirish","Jamoa shakllantirish","Mutaxassislarni bog‘lash","Resurslarga yo‘l ochish","Natijalarni tahlil qilish","G‘oyadan natijagacha","Hozirgi texnik holat"]) assert.ok(page.includes(phrase),phrase);
 assert.match(page,/<main class="about-wrap"/);
 assert.match(page,/assets\/idea-shell\.css/);
 assert.match(page,/assets\/idea-shell\.js/);
 assert.match(page,/aria-labelledby=/);
});

test("About page is linked from the global navigation and uses responsive layouts",()=>{
 const shell=read("assets/idea-shell.js");
 const page=read("about.html");
 assert.match(shell,/\["Platforma haqida","about\.html"\]/);
 assert.match(page,/@media\(max-width:620px\)/);
 assert.match(page,/prefers-reduced-motion:reduce/);
});
