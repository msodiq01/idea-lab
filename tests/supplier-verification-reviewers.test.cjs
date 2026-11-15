const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261117_supplier_verification_reviewers.sql'), 'utf8');

test('reviewer assignments are server-managed and hidden from clients', () => {
  assert.match(migration, /create table if not exists public\.supplier_verification_reviewers/i);
  assert.match(migration, /revoke all on public\.supplier_verification_reviewers from public, anon, authenticated/i);
  assert.match(migration, /grant all on public\.supplier_verification_reviewers to service_role/i);
  assert.doesNotMatch(migration, /grant[^;]+supplier_verification_reviewers to authenticated/i);
});

test('reviewer identity is derived from the authenticated session and active allowlist', () => {
  assert.match(migration, /v_reviewer_id uuid := auth\.uid\(\)/i);
  assert.match(migration, /r\.user_id = v_reviewer_id and r\.is_active = true/i);
  assert.match(migration, /security definer[\s\S]*set search_path = pg_catalog, public/i);
  assert.match(migration, /public\.is_supplier_verification_reviewer\(\)/i);
});

test('review RPC validates transitions and serializes decisions', () => {
  assert.match(migration, /if p_next_status is null or p_next_status not in/i);
  assert.match(migration, /for update/i);
  assert.match(migration, /v_application\.status = 'submitted'/i);
  assert.match(migration, /v_application\.status = 'under_review'/i);
  assert.match(migration, /v_application\.status = 'needs_more_info'/i);
  assert.match(migration, /Invalid verification status transition/i);
});

test('approval requires evidence and verification type; sensitive decisions require notes', () => {
  assert.match(migration, /p_next_status = 'approved'/i);
  assert.match(migration, /Evidence must be recorded before approval/i);
  assert.match(migration, /Verification type is required for approval/i);
  assert.match(migration, /p_next_status in \('needs_more_info','rejected'\)/i);
});

test('reviewer decisions and audit events are atomic and server-attributed', () => {
  assert.match(migration, /reviewer_user_id = v_reviewer_id/i);
  assert.match(migration, /reviewed_at = case when p_next_status in \('approved','rejected'\) then now\(\)/i);
  assert.match(migration, /insert into public\.supplier_verification_events/i);
  assert.match(migration, /p_application_id, v_reviewer_id, v_application\.status, p_next_status/i);
  assert.match(migration, /grant execute on function public\.review_supplier_verification_application[\s\S]*to authenticated/i);
});

test('migration is additive and transaction wrapped', () => {
  assert.match(migration, /begin;[\s\S]*commit;/i);
  assert.doesNotMatch(migration, /drop table|truncate table|delete from public\./i);
});
