# IDEA LAB backend rollout gates

Status: **prepared in repository; not deployed**. Updated: 2026-11-16.

## Current verified boundary

- The connected Supabase project is the only active free project available to this workspace. A separate disposable staging project could not be created under the current free-project limit.
- The live database has the original `public` resource/accounting schema. The IDEA LAB application schema (`idea_app`) and private authorization-helper schema (`idea_private`) are not present in the live database.
- Existing production migrations are separate from the repository drafts. Do not mark repository files as applied.
- Browser configuration remains `offline-demo`; URL and publishable key are blank.
- No IDEA LAB migration, Data API exposure change, Auth provider change, Storage bucket change, or Edge Function deployment is authorized by this readiness work.

## Repository migration order

Apply only to a disposable staging database, after the full SQL review:

1. `20261116120000_idea_app_identity_organizations.sql`
2. `20261116130000_idea_app_projects_teams.sql`
3. `20261116140000_idea_app_projects_rls.sql`
4. `20261116150000_idea_app_project_member_commands.sql`
5. `20261116160000_idea_app_listings_applications.sql`
6. `20261116170000_idea_app_specialists_resources_partnerships.sql`
7. `20261116180000_idea_app_storage_private_assets.sql`
8. `20261116190000_idea_app_project_commands.sql`

This sequence is a dependency order, **not** permission to run these migrations against production.

## Mandatory gates before any staging migration

- Confirm the target project ref and environment; verify it is disposable and contains no user/production data.
- Capture a restorable backup/snapshot and rehearse restore.
- Review every migration's complete SQL, dependency graph, trigger semantics, grants, RLS policies, indexes, views, and Storage policies.
- Run migrations in order and stop immediately on any error; never skip a failed migration.
- Run the read-only SQL preflights and inspect every resulting table, policy, function privilege, and grant.
- Execute real PostgreSQL/JWT acceptance tests with anonymous access and two independent authenticated users (A and B). Include owner, manager, contributor, viewer, applicant, specialist, resource owner, and unrelated-user cases.
- Verify negative cases as carefully as positive cases: cross-user reads/writes, identity/role escalation, private contacts, internal IDs, and Storage path traversal must all be denied.
- Test Auth signup, sign-in, sign-out, recovery, and session refresh with actual configured providers.
- Test Storage upload/download/update/delete with two users and MIME/size/path violations.
- Inspect logs and security/performance advisors after tests.

## SQL audit findings (static review)

- The six schema/RLS feature migrations define 16 application tables; all 16 have RLS enabled in their respective migration files.
- The RLS/command/catalogue migrations define 68 named policies. Every statically extracted `FOR UPDATE` policy includes both `USING` and `WITH CHECK` clauses.
- Seven `SECURITY DEFINER` helper functions were found in `idea_private`; each pins `search_path` to the empty string and is explicitly revoked from `PUBLIC`, `anon`, and `authenticated` before the intended authenticated-only execute grant. No `SECURITY DEFINER` function was found in `public`.
- The command migration `20261116190000_idea_app_project_commands.sql` was missing from the earlier README/runbook sequence; it is now included after its table/trigger dependencies.
- **Important integration mismatch:** `assets/idea-data.js` currently calls RPCs and reads views in `idea_app`. That schema must not be exposed wholesale because it also contains base tables. Before activation, move the browser contract to a dedicated exposed `idea_api` schema: safe invoker views that read from unexposed `idea_app`, plus narrow `SECURITY INVOKER` wrappers for the five existing commands. Keep `idea_app` and `idea_private` out of the exposed-schema list. Update the frontend gateway to `idea_api` only after that migration is reviewed and tested.
- Static review is not a SQL parser or runtime proof. PostgreSQL execution, grants as actually resolved by PostgREST, two-user JWT tests, and Storage tests remain mandatory.

## Data API and frontend activation gate

Do **not** expose `idea_app` as a whole. Some `security_invoker` views depend on underlying table grants; exposing the schema without a redesigned public API boundary could expose base-table identifiers and internal columns. Before activation:

1. Design a dedicated API surface for safe public projections (separate narrowly granted schema, carefully reviewed RPC, or separately maintained projection tables).
2. Keep `idea_private` unexposed. Never grant browser roles direct access to private helper schema or internal helper functions unless a reviewed policy specifically requires it.
3. Grant only the exact columns and operations needed; keep RLS enabled and test effective privileges using anon/authenticated roles.
4. Review every `SECURITY DEFINER` function for fixed `search_path`, minimal privileges, no dynamic SQL, and caller-bound authorization.
5. Keep service-role keys, database passwords, JWT secrets, SMTP credentials, and SMS provider tokens server-side only.
6. Configure custom SMTP for production email and a supported SMS provider for phone OTP. Add CAPTCHA/rate limiting before public signup.
7. Switch the frontend out of `offline-demo` only after the API contract and two-user acceptance matrix pass.

## Production rollout gate

Production changes require a separate explicit approval after staging passes, a fresh backup/restore check, an ordered migration plan, a rollback plan, and a maintenance/monitoring plan. Existing `public` resource/accounting tables must remain unchanged by the IDEA LAB app rollout.

## Current blockers

- No disposable staging project is available on the current free-project allowance.
- No live PostgreSQL execution of these eight draft migrations has been performed.
- No real two-user JWT RLS or Storage acceptance test has been performed.
- Auth email/SMS provider configuration and CAPTCHA are not complete.
- A dedicated safe API exposure boundary has not yet been implemented.
- The frontend remains intentionally offline.

**Readiness conclusion:** repository architecture and draft migrations exist, but backend activation is **not yet safe or verified**. Static tests can catch regressions; they do not prove PostgreSQL migration correctness or runtime authorization.
