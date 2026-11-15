const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const fn = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'functions', 'supplier-verification-evidence', 'index.ts'), 'utf8');
const migration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261119_supplier_verification_evidence_access_audit.sql'), 'utf8');

test('Edge Function authenticates callers and keeps service credentials server-side', () => {
  assert.match(fn, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(fn, /admin\.auth\.getUser\(tokenMatch\[1\]\)/);
  assert.match(fn, /Bearer\\s\+/);
  assert.doesNotMatch(fn, /localStorage|document\.cookie/);
});

test('upload ticket is owner-scoped and status-scoped with opaque server path', () => {
  assert.match(fn, /supplier_user_id !== actor\.id/);
  assert.match(fn, /\["submitted", "needs_more_info"\]/);
  assert.match(fn, /crypto\.randomUUID\(\)/);
  assert.match(fn, /createSignedUploadUrl\(path, \{ upsert: false \}\)/);
});

test('finalization checks stored object metadata before inserting evidence metadata', () => {
  assert.match(fn, /\.list\(folder, \{ search: filename, limit: 10 \}\)/);
  assert.match(fn, /MIME_TYPES\.has\(contentType\)/);
  assert.match(fn, /size > MAX_BYTES/);
  assert.match(fn, /from\("supplier_verification_evidence"\)[\s\S]*\.insert\(/);
  assert.match(fn, /UUID_RE\.test\(filename\)/);
});

test('download links require owner or active reviewer with an exact active case assignment and expire quickly', () => {
  assert.match(fn, /from\("supplier_verification_reviewers"\)/);
  assert.match(fn, /\.eq\("user_id", actor\.id\)/);
  assert.match(fn, /\.eq\("is_active", true\)/);
  assert.match(fn, /from\("supplier_verification_review_assignments"\)/);
  assert.match(fn, /\.eq\("application_id", evidence\.application_id\)/);
  assert.match(fn, /\.eq\("reviewer_user_id", actor\.id\)/);
  assert.match(fn, /if \(!isOwner && !isAssignedReviewer\)/);
  assert.ok(fn.indexOf("if (!isOwner && !isAssignedReviewer)") < fn.indexOf("createSignedUrl"));
  assert.match(fn, /DOWNLOAD_TTL_SECONDS = 60/);
  assert.match(fn, /createSignedUrl\(evidence\.private_storage_path, DOWNLOAD_TTL_SECONDS\)/);
});

test('link issuance is audited and API response is not cacheable', () => {
  assert.match(fn, /supplier_verification_evidence_access_events/);
  assert.match(fn, /download_link_issued/);
  assert.match(fn, /cache-control": "no-store"/);
  assert.match(migration, /revoke all on public\.supplier_verification_evidence_access_events from public, anon, authenticated/i);
  assert.match(migration, /grant all on public\.supplier_verification_evidence_access_events to service_role/i);
});

test('API uses explicit CORS allowlist and rejects unsupported methods', () => {
  assert.match(fn, /ALLOWED_ORIGINS/);
  assert.match(fn, /origins\.has\(origin\)/);
  assert.match(fn, /Method not allowed/);
});
