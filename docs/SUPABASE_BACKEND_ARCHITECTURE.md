# IDEA LAB Supabase backend architecture plan

## Decision
Use the isolated `idea_app` schema as the primary backend for the new IDEA LAB product modules. Keep the existing `public` financial/resource-accounting tables unchanged until a separate compatibility and data-ownership review is complete.

## Current production baseline (do not modify in this plan)
- Supabase project ref: configured in the project owner's dashboard; never put credentials in this repository.
- Existing live public schema: 9 tables with RLS enabled.
- Existing live migration history: four original foundation/hardening/RLS migrations.
- The live database does not yet contain `idea_app` or `idea_private`.
- Frontend configuration remains `offline-demo`; no live browser connection is enabled.
- No new migration has been applied to the live project.

## Target boundaries
- `idea_app`: product data such as organizations, projects, project membership, tasks, project updates, listings, applications, specialist profiles, resources, and partnerships.
- `idea_private`: narrowly scoped helper functions used by RLS policies and triggers. Do not expose this schema through the Supabase Data API.
- `public`: retain the existing financial/resource-accounting system for now. Do not move, rename, drop, or broaden grants on its tables as part of the IDEA LAB product rollout.
- Supabase Auth remains the identity provider. Ownership and applicant identity must derive from `auth.uid()`, not a client-supplied user ID.

## Migration policy
1. Treat the existing `idea_app` migrations as the canonical target design, but review every migration in timestamp/dependency order before use.
2. Do not run the legacy `public.*` security-hardening, supplier-verification, or application-notification migrations against the live project. They assume legacy product tables that are not part of the current live schema.
3. Do not create compatibility tables in `public` merely to make those legacy migrations pass.
4. Keep each migration transactional and additive where possible. Avoid destructive changes to the existing financial tables.
5. Before any production migration: confirm a backup/restore path, inspect the exact migration diff, verify required grants and RLS policies, and obtain a separate explicit production-apply confirmation.
6. Use only free-tier resources. Do not create paid branches, paid services, paid SMS providers, or change billing settings.

## Required security checks
- RLS enabled on every client-accessible table; use FORCE RLS where appropriate after reviewing SECURITY DEFINER ownership behavior.
- Revoke broad default privileges and grant only required schema/table/sequence/function privileges.
- Keep `idea_private` unexposed; helper functions must have a fixed safe `search_path`, narrow signatures, and minimal EXECUTE grants.
- Review SECURITY DEFINER functions for owner bypass, dynamic SQL identifier allowlists, authorization checks, and safe search paths.
- Prevent users from changing immutable identity/ownership columns or self-assigning privileged roles.
- Ensure application inserts bind the applicant to `auth.uid()`; validate target visibility/status server-side.
- Ensure public discovery exposes only explicitly approved fields and never contact details, private IDs, CV paths, or internal moderation data.
- Keep audit/activity writes server-controlled; clients must not forge audit rows.
- Review Storage bucket policies independently before enabling uploads.
- Keep service-role keys, database passwords, JWT secrets, SMTP credentials, and SMS provider tokens out of the browser and Git history.

## Validation sequence
1. Static SQL review and repository contract tests.
2. Apply migrations only to a disposable test project if an eligible free test project is explicitly approved and available; otherwise leave runtime RLS tests marked NOT RUN.
3. Run read-only schema/policy/grant preflight queries.
4. Test with two independent synthetic Auth users and separate JWT sessions.
5. Verify denied reads/writes as well as allowed owner/member/applicant flows.
6. Verify Auth email behavior with the default free SMTP limits; do not claim public email delivery is production-ready without a verified SMTP configuration.
7. Only after all checks pass, prepare a separate production migration proposal.

## Current release status
- Production database unchanged.
- Frontend remains in offline-demo mode.
- Email/password Auth adapter exists in the frontend but activation depends on reviewed URL configuration and email delivery constraints.
- Phone/SMS Auth is not enabled.
- Two-user runtime RLS tests are NOT RUN.
- Production backend activation is NOT APPROVED by this plan.

## Next implementation work
- Audit and complete the `idea_app` migration chain, including all newer supplier-verification and notification work, and resolve any schema/trigger/function dependencies.
- Add automated static checks for RLS coverage, exposed schemas, function privileges, and forbidden secret patterns.
- Keep legacy `public.*` modules isolated until a deliberate migration/compatibility design is approved.
