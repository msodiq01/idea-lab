const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const migration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261120_supplier_verification_case_assignments.sql'), 'utf8');

test('case assignments are private and service-role managed', () => {
  assert.match(migration, /create table if not exists public\.supplier_verification_review_assignments/i);
  assert.match(migration, /revoke all on public\.supplier_verification_review_assignments from public, anon, authenticated/i);
  assert.match(migration, /grant all on public\.supplier_verification_review_assignments to service_role/i);
  assert.doesNotMatch(migration, /grant[^;]+supplier_verification_review_assignments to authenticated/i);
});

test('application, event and evidence reads require an active case assignment', () => {
  assert.match(migration, /create or replace function public\.can_review_supplier_verification_application/i);
  assert.match(migration, /a\.reviewer_user_id = auth\.uid\(\)/i);
  assert.match(migration, /a\.is_active = true/i);
  assert.match(migration, /r\.is_active = true/i);
  assert.match(migration, /create policy "Assigned reviewers read verification applications"/i);
  assert.match(migration, /create policy "Assigned reviewers read verification events"/i);
  assert.match(migration, /create policy "Assigned reviewers read verification evidence"/i);
  assert.doesNotMatch(migration, /create policy "Active reviewers read verification (applications|events|evidence)"/i);
});

test('review RPC refuses decisions without explicit active case assignment', () => {
  assert.match(migration, /Active case assignment required/i);
  assert.match(migration, /a\.application_id = p_application_id/i);
  assert.match(migration, /a\.reviewer_user_id = v_reviewer_id/i);
  assert.match(migration, /a\.is_active = true/i);
  assert.match(migration, /for update/i);
  assert.match(migration, /insert into public\.supplier_verification_events/i);
});

test('assignment history supports revocation and re-assignment', () => {
  assert.match(migration, /revoked_at timestamptz/i);
  assert.match(migration, /where is_active = true/i);
  assert.match(migration, /unique index if not exists supplier_verification_one_active_case_reviewer_idx/i);
});

test('migration is additive and transaction wrapped', () => {
  assert.match(migration, /begin;[\s\S]*commit;/i);
  assert.doesNotMatch(migration, /drop table|truncate table|delete from public\./i);
});
