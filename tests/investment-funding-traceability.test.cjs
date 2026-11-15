"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const contract = fs.readFileSync(path.join(root, "INVESTMENT-FUNDING-TRACEABILITY.md"), "utf8");
const finance = fs.readFileSync(path.join(root, "FINANCE-MANAGEMENT-ARCHITECTURE.md"), "utf8");

test("funding traceability contract connects investor, resource, instruction, account and transfer", () => {
  for (const token of [
    "Investor → Investment → Resource → Payment instruction → Destination account → Money transfer → Transfer allocation",
    "investment_id", "resource_id", "destination_account_id", "recipient_user_id"
  ]) assert.ok(contract.includes(token), "Missing traceability element: " + token);
});

test("destination account visibility is limited to the investor's exact accepted instruction", () => {
  assert.match(contract, /faqat o‘z investitsiyasiga aniq bog‘langan destination account/);
  assert.match(contract, /Boshqa investor/);
  assert.match(contract, /masked_identifier/);
  assert.match(contract, /To‘liq karta raqami, CVV, PIN/);
});

test("account-holder consent and server-side payment confirmation are required", () => {
  assert.match(contract, /Hisob egasi/);
  assert.match(contract, /approved/);
  assert.match(contract, /Investor yoki resurs egasi o‘zi to‘lovni tasdiqlab qo‘ya olmaydi/);
  assert.match(contract, /audit/);
});

test("contract clearly states the current live RLS gap and staging-only next step", () => {
  assert.match(contract, /investor o‘z investitsiyasiga tegishli qabul qiluvchi hisobni hozir bevosita ko‘ra olmaydi/i);
  assert.match(contract, /client write grantlari berilmagan/);
  assert.match(contract, /aniq staging loyihasi, backup\/restore sinovi/);
});

test("finance architecture links the funding traceability contract without claiming live payments", () => {
  assert.match(finance, /INVESTMENT-FUNDING-TRACEABILITY\.md/);
  assert.match(finance, /not a live payment feature|not yet a live financial service/i);
});
