"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadCore() {
  const storage = new Map();
  const localStorage = {
    getItem: key => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key)
  };
  const context = { console, Date, Intl, Math, Map, Set, Object, Array, String, Number, Boolean, RegExp, JSON, localStorage };
  context.window = context;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../assets/idea-core.js"), "utf8"), context);
  return context.IDEALAB;
}

test("01 safe JSON parser returns parsed object", () => {
  assert.deepEqual(loadCore().validation.safeJsonParse('{"ok":true}', null), { ok: true });
});
test("02 safe JSON parser uses fallback for malformed and non-string input", () => {
  const v = loadCore().validation;
  assert.equal(v.safeJsonParse("{broken", "fallback"), "fallback");
  assert.equal(v.safeJsonParse(null, 7), 7);
});
test("03 text cleaner trims and removes control characters", () => {
  assert.equal(loadCore().validation.cleanText("  Salom\u0000 dunyo  "), "Salom dunyo");
});
test("04 text cleaner enforces a maximum length", () => {
  assert.equal(loadCore().validation.cleanText("abcdef", 3), "abc");
});
test("05 email validation accepts a normal address", () => {
  assert.equal(loadCore().validation.validateFields({ email: "a@example.uz" }, { email: { type: "email", required: true } }).valid, true);
});
test("06 email validation rejects malformed address", () => {
  assert.equal(loadCore().validation.validateFields({ email: "not-an-email" }, { email: { type: "email" } }).valid, false);
});
test("07 phone validation accepts a plausible international number", () => {
  assert.equal(loadCore().validation.validateFields({ phone: "+998 90 123 45 67" }, { phone: { type: "phone" } }).valid, true);
});
test("08 money validation rejects negative and infinite values", () => {
  const v = loadCore().validation;
  assert.equal(v.isValidMoney(-1), false);
  assert.equal(v.isValidMoney(Infinity), false);
  assert.equal(v.isValidMoney("125000"), true);
});
test("09 money validation respects configured maximum", () => {
  assert.equal(loadCore().validation.isValidMoney(1001, { maximum: 1000 }), false);
});
test("10 ISO date validation accepts real calendar dates", () => {
  const v = loadCore().validation;
  assert.equal(v.isValidIsoDate("2026-11-15"), true);
  assert.equal(v.isValidIsoDate("2026-02-30"), false);
});
test("11 required fields produce field-level messages", () => {
  const result = loadCore().validation.validateFields({ title: " " }, { title: { required: true, label: "Sarlavha" } });
  assert.equal(result.valid, false);
  assert.ok(result.errors.title);
});
test("12 text rules enforce minimum and maximum length", () => {
  const v = loadCore().validation;
  assert.equal(v.validateFields({ name: "A" }, { name: { type: "text", minLength: 2 } }).valid, false);
  assert.equal(v.validateFields({ name: "Valid" }, { name: { type: "text", maxLength: 8 } }).valid, true);
});
test("13 enum rules reject values outside the allowlist", () => {
  assert.equal(loadCore().validation.validateFields({ status: "root" }, { status: { type: "enum", values: ["draft", "active"] } }).valid, false);
});
test("14 pagination normalizes bounds and caps page size", () => {
  const result = loadCore().validation.normalizePagination({ page: -3, pageSize: 1000, total: 250 });
  assert.equal(result.page, 1);
  assert.equal(result.pageSize, 100);
  assert.equal(result.totalPages, 3);
});
test("15 API errors map HTTP status to safe user messages", () => {
  const result = loadCore().validation.normalizeApiError({ message: "SQL detail" }, 403);
  assert.equal(result.code, "FORBIDDEN");
  assert.equal(result.message, "Bu amal uchun ruxsat yo‘q.");
  assert.equal(result.message.includes("SQL"), false);
});
test("16 API error response preserves safe field errors and request ID only", () => {
  const result = loadCore().validation.normalizeApiError({ error: { code: "VALIDATION_ERROR", fields: { title: "Required" }, requestId: "req-123", message: "secret" } });
  assert.deepEqual(JSON.parse(JSON.stringify(result.fields)), { title: "Required" });
  assert.equal(result.requestId, "req-123");
  assert.equal("cause" in result, false);
});
test("17 public profile projection removes contact and credential fields", () => {
  const result = loadCore().privacy.publicProfile({ id: "u1", fullName: "Test User", email: "x@example.com", phone: "123", roles: ["admin"], resume_path: "private.pdf", profession: "Designer" });
  assert.equal(result.fullName, "Test User");
  assert.equal(result.profession, "Designer");
  assert.equal("email" in result, false);
  assert.equal("phone" in result, false);
  assert.equal("roles" in result, false);
  assert.equal("resume_path" in result, false);
});
test("18 applicant may withdraw own active application", () => {
  const api = loadCore().applications;
  assert.equal(api.canTransition({ applicantId: "a", status: "submitted" }, "withdrawn", "a", "owner"), true);
});
test("19 target owner may review application but cannot change another target", () => {
  const can = loadCore().applications.canTransition;
  assert.equal(can({ applicantId: "a", status: "submitted" }, "reviewing", "owner", "owner"), true);
  assert.equal(can({ applicantId: "a", status: "submitted" }, "reviewing", "other", "owner"), false);
});
test("20 applicant cannot accept own application and terminal state cannot reopen", () => {
  const can = loadCore().applications.canTransition;
  assert.equal(can({ applicantId: "a", status: "submitted" }, "accepted", "a", "owner"), false);
  assert.equal(can({ applicantId: "a", status: "completed" }, "reviewing", "owner", "owner"), false);
});
test("21 offline adapter is explicit and never pretends to persist", () => {
  const adapter = loadCore().backend.createOfflineAdapter();
  assert.equal(adapter.mode, "offline-demo");
  assert.equal(adapter.authenticated, false);
  assert.equal(adapter.create({}).error.code, "BACKEND_NOT_CONFIGURED");
  assert.equal(adapter.list().ok, false);
});
test("22 validators reject arrays and non-object records", () => {
  const v = loadCore().validation;
  assert.equal(v.validateFields([], {}).valid, false);
  assert.equal(v.validateFields(null, {}).valid, false);
});
