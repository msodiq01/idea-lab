# Supplier verification administrator Edge Function

Function name: `supplier-verification-admin`

## Purpose

This server-only control plane supports:
- listing active and inactive reviewer accounts;
- activating/deactivating reviewer authority;
- listing open verification cases without supplier personal details or evidence;
- assigning an active reviewer to a case;
- revoking a case assignment;
- viewing assignment and administrator action history.

Every request must include an Auth access token. The function validates the token with Supabase Auth, then checks the caller against `supplier_verification_admins`. It does not trust a role, user ID, or admin flag supplied by the browser.

## Required migrations

Apply the core supplier verification migrations in order, including:
- `20261120_supplier_verification_case_assignments.sql`
- `20261121_supplier_verification_admin_control.sql`

See `supabase/README.md` for the complete order and staging precautions.

## First administrator bootstrap

The first administrator must be inserted into `supplier_verification_admins` through a trusted database owner session after the project owner has verified the person's authority. The repository contains only an example comment; no real user IDs are embedded.

Do not build a browser-side bootstrap form. Do not grant authenticated users access to the admin allowlist.

## Deployment secrets

Configure these Edge Function secrets:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ALLOWED_ORIGINS` (exact HTTPS origins, comma-separated)

The service-role key must remain server-side. The browser uses only the public publishable/anon key and the signed-in user's access token.

## API actions

All actions are POST JSON requests through the Edge Function:
- `list_reviewers`
- `list_cases`
- `list_assignments` (optional `applicationId`)
- `list_history`
- `set_reviewer` (`reviewerUserId`, `isActive`, optional `note`)
- `assign_case` (`applicationId`, `reviewerUserId`, optional `note`)
- `revoke_case` (`assignmentId`, optional `note`)

The function limits request size and list lengths. Reviewer IDs are validated against Auth accounts. SQL mutation functions independently check the administrator allowlist and write audit events.

## Deactivation behavior

Deactivating a reviewer also revokes every active case assignment and writes a revocation event for each one. Reactivating that reviewer does not restore old assignments; an administrator must explicitly assign cases again.

## Staging checks

Use synthetic accounts and applications only:
1. Non-admin authenticated user is denied every action.
2. Admin can list reviewer IDs, open case IDs, assignments and history.
3. Unknown Auth user cannot be added as reviewer.
4. Inactive reviewer cannot be assigned to a case.
5. Duplicate active assignment is rejected.
6. Revocation blocks case reads, evidence download tickets and review decisions.
7. Deactivating reviewer revokes all active assignments; reactivation does not restore them.
8. Admin actions create server-attributed audit events.
9. Service-role key is absent from browser assets and repository history.
10. Evidence download function denies an active but unassigned reviewer.

The function and migration are not deployed or live-tested. Do not use real personal or identity documents until an authorized project owner completes privacy/legal review and staging validation.
