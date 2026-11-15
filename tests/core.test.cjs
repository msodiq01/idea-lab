"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const coreSource = fs.readFileSync(
  path.join(__dirname, "..", "assets", "idea-core.js"),
  "utf8"
);

function createCore(options = {}) {
  const data = new Map();
  const localStorage = {
    getItem(key) {
      if (options.failReads) throw new Error("Read blocked");
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      if (options.failWrites) throw new Error("Quota exceeded");
      data.set(key, String(value));
    },
    removeItem(key) {
      if (options.failRemoves) throw new Error("Remove blocked");
      data.delete(key);
    }
  };
  const window = { localStorage };
  vm.runInNewContext(coreSource, { window, console }, { filename: "idea-core.js" });
  return { api: window.IDEALAB, data, localStorage };
}

test("1. Core offline demo holatini va autentifikatsiya yo‘qligini bildiradi", () => {
  const { api } = createCore();
  assert.equal(api.environment.backend, "offline-demo");
  assert.equal(api.environment.authenticated, false);
  assert.equal(api.version, "1.0.0");
});

test("2. Legacy allowlist takrorlanmaydi va noma’lum kalit rad etiladi", () => {
  const { api } = createCore();
  const keys = Array.from(api.legacy.keys);
  assert.equal(keys.length, new Set(keys).size);
  assert.equal(api.legacy.read("not-allowed", null).ok, false);
});

test("3. Markaziy store yozish, o‘qish va o‘chirishni bajaradi", () => {
  const { api } = createCore();
  assert.equal(api.store.set("test.value", { count: 3 }).ok, true);
  assert.deepEqual(JSON.parse(JSON.stringify(api.store.get("test.value"))), { count: 3 });
  assert.equal(api.store.remove("test.value").ok, true);
  assert.equal(api.store.get("test.value", "fallback"), "fallback");
});

test("4. Noto‘g‘ri JSON legacy o‘qishda xavfsiz fallback beradi", () => {
  const { api, data } = createCore();
  data.set("projects", "{not-json");
  assert.deepEqual(api.legacy.read("projects", []), []);
});

test("5. Legacy yozuv va inspect mavjud formatni saqlaydi", () => {
  const { api } = createCore();
  const projects = [{ id: "p-1", title: "Sinov loyiha" }];
  assert.equal(api.legacy.write("projects", projects).ok, true);
  assert.deepEqual(JSON.parse(JSON.stringify(api.legacy.read("projects", []))), projects);
  const report = api.legacy.inspect(["projects"]);
  assert.equal(report.ok, true);
  assert.equal(report.items[0].valueType, "array");
  assert.equal(report.items[0].itemCount, 1);
});

test("6. Backup eski yozuvning xom JSON qiymatini saqlaydi", () => {
  const { api, data } = createCore();
  const raw = '[{"id":"old-1","name":"Saqlangan yozuv"}]';
  data.set("teams", raw);
  const backup = api.legacy.createBackup(["teams"]);
  assert.equal(backup.ok, true);
  const restored = api.legacy.readBackup(backup.backupId);
  assert.equal(restored.ok, true);
  assert.equal(restored.snapshot.records.teams, raw);
  assert.equal(data.get("teams"), raw);
});

test("7. HTML escape xavfli belgilarni kodlaydi", () => {
  const { api } = createCore();
  assert.equal(
    api.escapeHtml('<img src="x" onerror="run()">'),
    "&lt;img src=&quot;x&quot; onerror=&quot;run()&quot;&gt;"
  );
});

test("8. Email va telefon validatsiyasi chegaraviy holatlarni tekshiradi", () => {
  const { api } = createCore();
  assert.equal(api.isValidEmail("test@example.uz"), true);
  assert.equal(api.isValidEmail("noto‘g‘ri-email"), false);
  assert.equal(api.isValidPhone("+998 90 123 45 67"), true);
  assert.equal(api.isValidPhone("123"), false);
});

test("9. Hodisa obunasi ishlaydi va unsubscribe’dan keyin to‘xtaydi", () => {
  const { api } = createCore();
  let calls = 0;
  const unsubscribe = api.subscribe("test:event", () => { calls += 1; });
  api.emit("test:event", { ok: true });
  unsubscribe();
  api.emit("test:event", { ok: false });
  assert.equal(calls, 1);
});

test("10. Status lug‘ati va sana formatlash noto‘g‘ri sanani boshqaradi", () => {
  const { api } = createCore();
  assert.equal(api.statusLabel("application", "accepted"), "Qabul qilindi");
  assert.equal(api.statusLabel("unknown", "x"), "Noma'lum holat");
  assert.equal(api.formatDate("not-a-date"), "Sana ko'rsatilmagan");
});

test("11. localStorage xatosi boshqariladi va core yiqilib tushmaydi", () => {
  const { api } = createCore({ failWrites: true });
  assert.equal(api.store.set("blocked", 1).ok, false);
  assert.equal(api.legacy.write("projects", []).ok, false);
  assert.equal(api.storageAvailable(), false);
});
