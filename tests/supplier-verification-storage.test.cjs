const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migration = fs.readFileSync(
  path.join(__dirname, '..', 'supabase', 'migrations', '20261118_supplier_verification_private_storage.sql'),
  'utf8'
);

test('verification evidence bucket is private and constrained', () => {
  assert.match(migration, /'supplier-verification-private'[\s\S]*false[\s\S]*10485760/i);
  assert.match(migration, /array\['application\/pdf','image\/jpeg','image\/png'\]/i);
  assert.match(migration, /on conflict \(id\) do update[\s\S]*public = false/i);
});

test('supplier uploads are restricted to own open application and allowed document folders', () => {
  assert.match(migration, /for insert to authenticated[\s\S]*with check/i);
  assert.match(migration, /array_length\(storage\.foldername\(name\), 1\) = 2/i);
  assert.match(migration, /business_registration[\s\S]*representative_authority[\s\S]*business_address[\s\S]*other/i);
  assert.match(migration, /a\.id::text = \(storage\.foldername\(name\)\)\[1\]/i);
  assert.match(migration, /a\.supplier_user_id = auth\.uid\(\)/i);
  assert.match(migration, /a\.status in \('submitted','needs_more_info'\)/i);
  assert.match(migration, /storage\.filename\(name\) ~ /i);
});

test('only owner and active reviewers can read evidence objects', () => {
  assert.match(migration, /Supplier reads own verification evidence[\s\S]*for select to authenticated/i);
  assert.match(migration, /Active reviewers read verification evidence[\s\S]*public\.is_supplier_verification_reviewer\(\)/i);
  assert.match(migration, /a\.supplier_user_id = auth\.uid\(\)/i);
});

test('clients receive no overwrite or delete capability', () => {
  assert.doesNotMatch(migration, /create policy[^;]+for update on storage\.objects/i);
  assert.doesNotMatch(migration, /create policy[^;]+for delete on storage\.objects/i);
  assert.match(migration, /no client UPDATE or DELETE policies/i);
});

test('migration is transaction wrapped and does not create a public bucket', () => {
  assert.match(migration, /begin;[\s\S]*commit;/i);
  assert.match(migration, /public = false/i);
  assert.doesNotMatch(migration, /public = true/i);
});
