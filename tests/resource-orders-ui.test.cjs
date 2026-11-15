"use strict";const assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const html=fs.readFileSync(path.join(__dirname,"..","resource-orders.html"),"utf8"),shell=fs.readFileSync(path.join(__dirname,"..","assets","idea-shell.js"),"utf8");
for(const t of ["investorId","supplierId","supplierName","resourceName","purpose","quantity","unitPrice","invoiceReference","paymentReference","deliveryReference","receiptReference","history","forParticipant","model.transition","localStorage"])assert.ok(html.includes(t),"Missing "+t);
assert.ok(shell.includes('["Resurs buyurtmalari","resource-orders.html"]'));
assert.match(html,/ID kiritishning o‘zi shaxsni tasdiqlamaydi/);
assert.match(html,/pulni qabul qilmaydi, saqlamaydi yoki o‘tkazmaydi/);
console.log("Three-party resource order UI tests passed.");
