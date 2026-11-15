# Supplier verification — staging deployment runbook

Status: **preparation only**. No Supabase project is connected by this repository, and no migration or Edge Function has been deployed.

This runbook is for an authorized project owner working in a **new, disposable staging Supabase project**. Do not use production, real supplier records, identity documents, bank details, or other personal documents during acceptance testing.

## 0. Go/no-go gate

Before running SQL, the project owner must confirm all of the following:

- [ ] The Supabase project name and project ref are the intended staging project.
- [ ] The project owner has authority to administer the project.
- [ ] A fresh backup exists and its restore procedure has been tested (for an existing staging database).
- [ ] The SQL files have been reviewed against the actual database state.
- [ ] Auth settings and the exact staging frontend origin are known.
- [ ] Synthetic test accounts and synthetic files are prepared.
- [ ] A privacy/security reviewer has approved the test scope.

If any item is unchecked, stop. Never paste credentials, access tokens, service-role keys, database passwords, or real user UUIDs into GitHub issues, source files, browser code, or chat.

## 1. Apply database files in exact order

Use the Supabase SQL Editor while signed into the staging project's trusted owner account. Apply one file at a time and stop immediately on any SQL error. Do not mark a file complete merely because it exists in GitHub.

1. `supabase/schema.sql` — initial shared schema and `public.set_updated_at()`.
2. `supabase/migrations/20261115_security_hardening.sql` — public directory views and additional guards.
3. `supabase/migrations/20261116_supplier_verification.sql` — supplier applications, evidence metadata, and submission audit.
4. `supabase/migrations/20261117_supplier_verification_reviewers.sql` — reviewer allowlist and review decision RPC.
5. `supabase/migrations/20261118_supplier_verification_private_storage.sql` — private Storage bucket and Storage policies.
6. `supabase/migrations/20261119_supplier_verification_evidence_access_audit.sql` — evidence access audit.
7. `supabase/migrations/20261120_supplier_verification_case_assignments.sql` — per-case reviewer assignment and narrowed access.
8. `supabase/migrations/20261121_supplier_verification_admin_control.sql` — administrator allowlist and audited admin operations.
9. `supabase/migrations/20261122_application_activity_notifications.sql` — participant-scoped application activity and notification events.

The first two files are prerequisites for the supplier verification migrations. In particular, the initial schema defines `public.set_updated_at()`, which the supplier application migration uses.

After each file, record the staging project ref (not a secret), filename, execution time, operator, and SQL Editor success/error. Never edit migration history manually to make a failed migration appear successful.

## 2. Read-only database preflight

After all nine files are applied, run `supabase/verification/supplier-verification-staging-preflight.sql`. It is read-only and checks expected tables and critical columns, required functions, privileged-function `SECURITY DEFINER` and pinned `search_path` settings, RLS flags, Storage bucket privacy, and client grants.

Review every result set. A missing object or column, a privileged function without the expected security settings, public bucket, unexpected client grant, or disabled RLS is a **stop condition**, not a warning to ignore. The preflight is a metadata check and does not replace live RLS/Storage acceptance tests. Also run `supabase/verification/security_audit.sql` and review its output.

## 3. Configure Edge Function secrets

In the staging project's Supabase Edge Function secrets settings, set:

- `SUPABASE_URL` — the staging project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — the staging service-role key, server-side only.
- `ALLOWED_ORIGINS` — exact staging HTTPS origin(s), comma-separated; do not use `*`.

Do not commit these values, put them in HTML/JavaScript, expose them in browser developer tools, or use the production service-role key in staging. The browser may receive only the public publishable/anon key through the existing `IDEALAB_CONFIG` mechanism.

## 4. Deploy the two functions to staging

Only after the migrations and preflight pass:

- Deploy `supabase/functions/supplier-verification-evidence/` as `supplier-verification-evidence`.
- Deploy `supabase/functions/supplier-verification-admin/` as `supplier-verification-admin`.

The repository's `supabase/config.toml` explicitly keeps gateway JWT verification enabled for both functions. Do not use `--no-verify-jwt`.

From a trusted local terminal after installing/authenticating the Supabase CLI, set `STAGING_PROJECT_REF` to the verified staging project's ref and deploy only to that explicit target:

```sh
supabase functions deploy supplier-verification-evidence --project-ref "$STAGING_PROJECT_REF"
supabase functions deploy supplier-verification-admin --project-ref "$STAGING_PROJECT_REF"
```

Before each command, independently confirm the variable still names the intended disposable staging project. Never print or commit CLI access tokens.

Do not enable real document collection. The functions are implementation foundations; the evidence function does not scan files for malware or prove document authenticity.

## 5. Bootstrap the first administrator

There is no default administrator. A trusted database owner must first verify the intended administrator's Auth account in the staging project and confirm their authority.

Only then, in the staging SQL Editor, execute the reviewed insert below after replacing the placeholder locally with that staging Auth user's UUID:

```sql
insert into public.supplier_verification_admins (user_id, note)
values ('<STAGING_AUTH_USER_UUID>', 'Initial staging administrator');
```

The placeholder is not a usable UUID. Never commit the substituted statement or real UUID to the repository. Do not create a browser-side bootstrap form and do not grant authenticated users access to the admin allowlist.

## 6. Configure the staging frontend

- Configure only the staging Supabase URL and public publishable/anon key using the existing `window.IDEALAB_CONFIG` integration pattern.
- Never add the service-role key to `IDEALAB_CONFIG`, a static page, or any client bundle.
- Confirm the admin page remains locked for signed-out and non-admin users.
- Confirm the admin workspace unlocks only after the server accepts `list_reviewers`.
- Keep all test records synthetic and clearly labelled.


## 7A. Read-only smoke runner

After both Edge Functions are deployed to staging and the allowed origin is configured, run the local Node.js smoke runner. It creates no records, uploads no files, and performs no reviewer/admin mutations.

Set these values only in the local terminal environment (never in a committed file):

- `STAGING_CONFIRM=YES`
- `SUPABASE_URL=https://<staging-project-ref>.supabase.co`
- `STAGING_PROJECT_REF=<same-staging-project-ref>`
- `SUPABASE_ANON_KEY=<staging-public-anon-or-publishable-key>`
- `STAGING_ALLOWED_ORIGIN=https://<exact-staging-frontend-origin>`

Optional, for role-boundary checks using synthetic accounts:

- `STAGING_USER_ACCESS_TOKEN=<synthetic-ordinary-user-token>`
- `STAGING_ADMIN_ACCESS_TOKEN=<synthetic-staging-admin-token>`

Then run:

```sh
node scripts/supplier-verification-staging-smoke.mjs
```

The script verifies the project-ref/HTTPS guard, exact CORS origin and required headers, unapproved-origin rejection, and unauthenticated denial. With a synthetic ordinary-user token, it also verifies unsupported-method rejection and ordinary-user denial; with a synthetic administrator token, it checks administrator read-only access. It prints HTTP statuses only, not credentials or response payloads.

A skipped optional check is not a pass. Do not paste access tokens into chat or GitHub. Do not use production credentials or real user accounts. The smoke runner supplements, but does not replace, the full acceptance matrix below.

## 7. Acceptance tests

Use separate synthetic Supplier A, Supplier B, Reviewer A, Reviewer B, Administrator, and ordinary authenticated user accounts. Use synthetic application records and harmless test files only.

| ID | Test | Expected result |
|---|---|---|
| SV-01 | Call either function without a bearer token | 401 |
| SV-02 | Call admin function with invalid JWT | 401 |
| SV-03 | Call admin function as ordinary authenticated user | 403 |
| SV-04 | Call from an origin not in `ALLOWED_ORIGINS` | 403 |
| SV-05 | Admin lists reviewers, open cases, assignments, and history | Only the documented fields are returned |
| SV-06 | Admin activates a real staging Auth user as reviewer | Success and audit event |
| SV-07 | Admin tries to assign an inactive reviewer | Rejected |
| SV-08 | Reviewer without assignment attempts to read a case or request evidence download | Denied |
| SV-09 | Reviewer assigned to Supplier A's case attempts Supplier B's case | Denied |
| SV-10 | Admin revokes assignment; reviewer retries case/evidence access | Denied |
| SV-11 | Admin deactivates reviewer | All active assignments revoked and audited |
| SV-12 | Admin reactivates reviewer | Old assignments remain revoked |
| SV-13 | Supplier A requests upload ticket for Supplier B's application | Denied |
| SV-14 | Owner requests evidence download ticket for own synthetic evidence | Allowed; signed link expires after 60 seconds |
| SV-15 | Evidence MIME type or size is unsupported | Rejected |
| SV-16 | Inspect browser assets and repository | No service-role key or database password present |
| SV-17 | Inspect Storage bucket and grants | Bucket remains private; no public access |
| SV-18 | Review audit records after assignment, revocation, and download-ticket issue | Actor and action are correctly recorded |

Record pass/fail evidence without storing tokens, signed URLs, or private file contents. A successful static source test is not a substitute for these live staging tests.

## 8. Rollback / containment

If a staging test fails:

1. Stop testing and disable the affected Edge Function(s) in the staging project.
2. Remove the synthetic administrator allowlist entry using the trusted owner session.
3. Deactivate synthetic reviewers and revoke their assignments.
4. Remove synthetic test applications and files only after preserving the test log required for diagnosis.
5. Rotate staging secrets if they may have been exposed.
6. Keep migration history and schema intact; do not drop tables or manually delete migration records as a rollback shortcut.
7. Diagnose and prepare a new reviewed migration if a schema correction is required.

Production rollout is a separate decision requiring a verified backup/restore plan, privacy/legal review, live RLS and Storage tests, monitoring, and an authorized project owner sign-off.

## 9. Current implementation status

- Repository schema and migration files: prepared.
- Staging project selected/verified: **not done**.
- SQL migrations applied: **not done / not verified**.
- Edge Function secrets configured: **not done**.
- Edge Functions deployed: **not done**.
- First staging administrator bootstrapped: **not done**.
- Live staging acceptance tests: **not done**.
- Production activation: **not authorized by this runbook**.
