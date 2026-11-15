const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261116_supplier_verification.sql'), 'utf8');

test('supplier verification migration is additive and creates three scoped tables', () => {
  assert.match(migration, /create table if not exists public\.supplier_verification_applications/i);
  assert.match(migration, /create table if not exists public\.supplier_verification_evidence/i);
  assert.match(migration, /create table if not exists public\.supplier_verification_events/i);
  assert.match(migration, /begin;[\s\S]*commit;/i);
  assert.doesNotMatch(migration, /drop table|truncate table|delete from public\./i);
});

test('application submission derives identity and state from the authenticated session', () => {
  assert.match(migration, /new\.supplier_user_id := auth\.uid\(\)/i);
  assert.match(migration, /new\.status := 'submitted'/i);
  assert.match(migration, /new\.reviewer_user_id := null/i);
  assert.match(migration, /new\.reviewed_at := null/i);
  assert.match(migration, /new\.consent_at := now\(\)/i);
});

test('client permissions exclude decisions, evidence access and audit writes', () => {
  assert.match(migration, /grant select, insert on public\.supplier_verification_applications to authenticated/i);
  assert.match(migration, /grant select on public\.supplier_verification_events to authenticated/i);
  assert.match(migration, /revoke all on public\.supplier_verification_evidence from public, anon, authenticated/i);
  assert.match(migration, /revoke all on public\.supplier_verification_events from public, anon, authenticated/i);
  assert.doesNotMatch(migration, /grant[^;]+update[^;]+supplier_verification_applications to authenticated/i);
  assert.doesNotMatch(migration, /grant[^;]+insert[^;]+supplier_verification_events to authenticated/i);
});

test('open application uniqueness and initial audit event are enforced', () => {
  assert.match(migration, /where status in \('submitted','under_review','needs_more_info'\)/i);
  assert.match(migration, /record_supplier_verification_submission/i);
  assert.match(migration, /'application_submitted'/i);
});

test('evidence metadata is private and document categories are allowlisted', () => {
  assert.match(migration, /document_type in \('business_registration','representative_authority','business_address','other'\)/i);
  assert.match(migration, /private_storage_path/i);
});
