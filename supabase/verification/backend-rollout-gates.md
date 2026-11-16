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

## Dedicated `idea_api` contract (design only; not implemented)

The browser gateway contract was inspected against the current draft migrations. The intended public surface is limited to these five read-only views:

| API view | Explicit output columns |
|---|---|
| `public_project_directory` | `slug, title, summary, category, project_type, project_status, start_date, target_date, published_at` |
| `public_project_updates` | `project_slug, title, body, update_type, published_at` |
| `public_specialist_directory` | `id, public_name, headline, bio, skill_tags, specialist_categories, city, country_code, portfolio_urls, availability_status, engagement_modes, created_at` |
| `public_resource_catalogue` | `slug, title, category, description, quantity_label, availability_label, location_label, public_terms, published_at` |
| `public_partnership_directory` | `slug, opportunity_type, title, summary, details, location_label, published_at` |

The API should also expose only these five authenticated command RPCs, retaining the existing parameter names and types:

| RPC | Signature |
|---|---|
| `create_project` | `(p_title text, p_summary text, p_description text, p_project_type text, p_visibility text, p_start_date date, p_target_date date) returns uuid` |
| `update_project` | `(p_project_id uuid, p_title text, p_summary text, p_description text, p_project_type text, p_status text, p_visibility text, p_start_date date, p_target_date date) returns uuid` |
| `request_project_membership` | `(p_project_id uuid) returns uuid` |
| `review_project_membership` | `(p_membership_id uuid, p_approve boolean, p_membership_role text) returns uuid` |
| `leave_project` | `(p_membership_id uuid) returns uuid` |

Implementation requirements for the future migration:

- Create `idea_api` with no browser `CREATE` privilege; revoke default `PUBLIC` access.
- Each API view must be `WITH (security_invoker = true)`, select an explicit column list from its matching `idea_app.public_*` view, and receive only `SELECT` grants for `anon` and `authenticated`.
- The underlying `idea_app` views are also invoker views. Keep their existing narrowly scoped grants and RLS-backed base-table access; do not grant browser roles broad table privileges.
- Each API RPC must be a `SECURITY INVOKER` wrapper calling its fully qualified `idea_app` command. Revoke default `PUBLIC` and `anon` execution; grant `EXECUTE` only to `authenticated`.
- Grant only `USAGE` on `idea_api` to the roles that need it. Keep `idea_app` and `idea_private` absent from the Data API exposed-schema list.
- Only after the migration is reviewed and tested should `assets/idea-data.js` change both read and RPC calls from `client.schema("idea_app")` to `client.schema("idea_api")`. Keep the frontend in `offline-demo` until then.
- Runtime tests must confirm PostgREST resolves the view chain as the caller, that anonymous catalogue reads expose only the listed columns, and that RPC calls work only for authenticated callers while preserving the existing RLS decisions.

This is a contract for implementation, not executable SQL and not evidence that the boundary exists.

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
- The Supabase CLI is not installed in the current work environment. Per the Supabase migration workflow, the API-boundary migration must first be created with `supabase migration new`; no migration file has been fabricated through the GitHub contents API.
- The frontend remains intentionally offline.

**Readiness conclusion:** repository architecture and draft migrations exist, but backend activation is **not yet safe or verified**. Static tests can catch regressions; they do not prove PostgreSQL migration correctness or runtime authorization.
