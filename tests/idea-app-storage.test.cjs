"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const sql = fs.readFileSync(
  path.join(root, "supabase/migrations/20261116180000_idea_app_storage_private_assets.sql"),
  "utf8"
);
const executableSql = sql.replace(/--.*$/gm, "");

test("IDEA LAB asset bucket is private and size/type constrained", () => {
  assert.match(sql, /insert into storage\.buckets/i);
  assert.match(sql, /'idea-user-assets'\s*,\s*'idea-user-assets'\s*,\s*false/i);
  assert.match(sql, /10485760/i);
  assert.match(sql, /image\/jpeg.*image\/png.*image\/webp.*application\/pdf/is);
  assert.match(sql, /on conflict \(id\) do update[\s\S]*?public = false/i);
});

test("Storage policies cover select, insert, update and delete for authenticated users only", () => {
  for (const [name, command] of [
    ["idea_user_assets_select_own", "select"],
    ["idea_user_assets_insert_own", "insert"],
    ["idea_user_assets_update_own", "update"],
    ["idea_user_assets_delete_own", "delete"]
  ]) {
    const start = sql.indexOf("create policy " + name);
    assert.notEqual(start, -1, name + " exists");
    const end = executableSql.indexOf(";", start);
    const statement = executableSql.slice(start, end);
    assert.match(statement, new RegExp("for " + command, "i"));
    assert.match(statement, /to authenticated/i);
    assert.match(statement, /bucket_id = 'idea-user-assets'/i);
    assert.match(statement, /storage\.foldername\(name\)\)\[1\] = \(select auth\.uid\(\)::text\)/i);
    assert.match(statement, /avatars.*organization-logos.*project-files/is);
    assert.match(statement, /storage\.filename\(name\)/i);
    assert.doesNotMatch(statement, /to anon|to public/i);
  }
});

test("Storage upsert policy constrains both existing and replacement object paths", () => {
  const start = sql.indexOf("create policy idea_user_assets_update_own");
  const end = executableSql.indexOf(";", start);
  const statement = executableSql.slice(start, end);
  assert.match(statement, /using \([\s\S]*?bucket_id = 'idea-user-assets'/i);
  assert.match(statement, /with check \([\s\S]*?bucket_id = 'idea-user-assets'/i);
  assert.equal((statement.match(/storage\.foldername\(name\)\)\[1\]/g) || []).length, 2);
});

test("Storage migration does not make assets public or grant anonymous access", () => {
  assert.match(sql, /public = false/i);
  assert.doesNotMatch(executableSql, /create policy[\s\S]*?to anon/i);
  assert.doesNotMatch(executableSql, /public\s*=\s*true/i);
});
