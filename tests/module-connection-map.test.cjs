const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const matrix = fs.readFileSync(path.join(root, "MODULE-CONNECTION-MATRIX.md"), "utf8");

test("module map distinguishes partial integration from demo-only modules", () => {
  assert.ok(matrix.includes("Qisman server"));
  assert.ok(matrix.includes("Demo / localStorage"));
  assert.ok(matrix.includes("Investorlar"));
  assert.ok(matrix.includes("Jamoalar va vakansiyalar"));
  assert.ok(matrix.includes("Bildirishnoma va faoliyat"));
});

test("main server-backed user journey is documented without claiming full platform rollout", () => {
  assert.ok(matrix.includes("Akkaunt (Auth) → Profil → Loyiha yaratish"));
  assert.ok(matrix.includes("ikki alohida test akkauntida RLS izolyatsiyasi"));
  assert.ok(matrix.includes("butun platforma to‘liq serverga ulangan deb hisoblanmaydi"));
});
