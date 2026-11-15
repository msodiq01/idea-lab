"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const html=fs.readFileSync(require("node:path").join(__dirname,"..","project-expenses.html"),"utf8");
for(const token of ["projectExpenseLedger","expenseTitle","expenseSupplier","expenseQuantity","expenseUnitPrice","expenseReceipt","IDEALABProjectExpenses","Hujjat bilan tasdiqlandi","localStorage","projectId"])assert.ok(html.includes(token),"Missing "+token);
assert.match(html,/To‘landi.*loyiha rahbari kiritgan qayd/);
assert.match(html,/hech qanday pulni qabul qilmaydi/);
assert.match(html,/project\.ownerId.*profile\.id/);
console.log("Project expense ledger UI tests passed.");
