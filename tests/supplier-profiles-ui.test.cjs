"use strict";const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"..","suppliers.html"),"utf8"),orders=fs.readFileSync(path.join(__dirname,"..","resource-orders.html"),"utf8"),shell=fs.readFileSync(path.join(__dirname,"..","assets","idea-shell.js"),"utf8"),model=fs.readFileSync(path.join(__dirname,"..","assets","idea-supplier-profiles.js"),"utf8");
for(const x of ["accountId","verificationStatus","documentReference","recordedOrders","completedOrders","summarize","mustaqil auditdan o‘tmagan"])assert.ok(html.includes(x),"Missing supplier UI element "+x);
assert.ok(model.includes('verificationStatus:"Tekshirilmagan"'),"Default status must remain unverified in the model");
assert.ok(orders.includes('href="suppliers.html?id="+encodeURIComponent(String(o.supplierId))'));
assert.ok(shell.includes('["Resurschilar katalogi","suppliers.html"]'));
console.log("Supplier profile UI tests passed.");
