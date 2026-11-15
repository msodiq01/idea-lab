# Supplier verification evidence Edge Function

Function: `supplier-verification-evidence`

## What it does

The authenticated Edge Function supports three POST actions:

1. `upload_ticket` — confirms the caller owns an open verification application, then creates a one-time signed upload token for a server-generated opaque object path.
2. `finalize_upload` — confirms the object exists in the expected application/document folder, checks Storage-reported MIME type and size, then inserts evidence metadata.
3. `download_ticket` — checks that the caller is the supplier owner or an active reviewer, issues a 60-second signed download URL, and records that the link was issued.

Responses use `Cache-Control: no-store`. Browser origins must be explicitly listed in `ALLOWED_ORIGINS`. The service-role key is read only from Edge Function secrets.

## Required migrations

Apply in order in a disposable Supabase staging project:

1. `20261116_supplier_verification.sql`
2. `20261117_supplier_verification_reviewers.sql`
3. `20261118_supplier_verification_private_storage.sql`
4. `20261119_supplier_verification_evidence_access_audit.sql`

The earlier core schema and security migrations must also be applied as documented in `supabase/README.md`.

## Server-side configuration

Set these secrets in the Supabase project; do not place them in frontend files or commit them:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ALLOWED_ORIGINS` — comma-separated exact HTTPS origins, e.g. the production app origin and a separately controlled staging origin. Do not use `*`.

Deploy the function only after reviewing the project, migrations, auth settings, and allowed origins. The function expects the caller to send `Authorization: Bearer <access_token>`.

## Client protocol

Use the normal publishable/anon-key Supabase client in the browser:

- Call the function with `{ action: "upload_ticket", applicationId, documentType }`.
- Upload the selected file using `storage.from("supplier-verification-private").uploadToSignedUrl(path, token, file, { contentType: file.type, upsert: false })`.
- Only after upload succeeds, call `{ action: "finalize_upload", applicationId, documentType, path }`.
- To view a file, call `{ action: "download_ticket", evidenceId }` and open the returned signed URL before its 60-second expiry.

Never send the service-role key to the browser. Never accept a caller-supplied supplier UID, storage path for a new upload, signed URL, or reviewer flag as authority.

## Important limitations

- This is an implementation foundation, not a deployed or production-validated API.
- The function does not scan file contents for malware or verify that a PDF/image is genuine. Storage MIME metadata is not proof of file safety or authenticity.
- Download audit records link issuance, not actual download, view, screenshot, or onward sharing.
- The current reviewer allowlist is global; any active reviewer can access evidence across applications. Case-level reviewer assignment is not implemented.
- No rate limiting, quota policy, automated retention cleanup, file-content transformation, or deletion workflow is implemented.
- A signed upload token is temporary but its validity period is controlled by Supabase Storage; the function does not claim a custom upload-token expiry.
- The migration and function have not been applied/deployed. Do not upload real personal, identity, banking, or business documents until an authorized adult project owner and qualified reviewer have completed privacy/legal review and staging tests.

## Staging acceptance tests

Use synthetic files only and two separate test accounts:

- Supplier A can request a ticket for A's own submitted/needs-more-info application.
- Supplier A cannot request a ticket for Supplier B's application.
- Supplier A cannot finalize an object outside its own application/document folder.
- Unsupported MIME type, empty file, and file over 10 MiB are rejected.
- Only owner and active reviewer can request a download link.
- Revoked reviewer and unrelated supplier are denied.
- Download-link issuance creates exactly one access event.
- Anonymous callers, invalid JWTs, unapproved origins, and non-POST methods are rejected.
- No browser bundle or repository file contains the service-role secret.
