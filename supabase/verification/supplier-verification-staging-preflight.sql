-- IDEA LAB supplier verification staging preflight
-- READ ONLY. Run only after applying schema.sql and migrations through 20261122
-- in a disposable staging project. This script does not mutate database state.

-- 1) Expected tables and RLS state. Every listed table should be present with RLS enabled.
with expected(table_name) as (
  values
    ('supplier_verification_applications'),
    ('supplier_verification_evidence'),
    ('supplier_verification_events'),
    ('supplier_verification_reviewers'),
    ('supplier_verification_review_assignments'),
    ('supplier_verification_assignment_events'),
    ('supplier_verification_admins'),
    ('supplier_verification_evidence_access_events'),
    ('application_activity')
)
select e.table_name,
       (c.oid is not null) as exists,
       coalesce(c.relrowsecurity, false) as rls_enabled,
       coalesce(c.relforcerowsecurity, false) as rls_forced
from expected e
left join pg_namespace n on n.nspname = 'public'
left join pg_class c on c.relnamespace = n.oid
  and c.relname = e.table_name and c.relkind = 'r'
order by e.table_name;

-- 1b) Critical columns. Each row must return exists = true.
with expected(table_name, column_name) as (
  values
    ('supplier_verification_applications', 'id'),
    ('supplier_verification_applications', 'supplier_user_id'),
    ('supplier_verification_applications', 'status'),
    ('supplier_verification_applications', 'consent_version'),
    ('supplier_verification_applications', 'consent_at'),
    ('supplier_verification_applications', 'submitted_at'),
    ('supplier_verification_applications', 'reviewer_user_id'),
    ('supplier_verification_applications', 'reviewed_at'),
    ('supplier_verification_applications', 'created_at'),
    ('supplier_verification_applications', 'updated_at'),
    ('supplier_verification_evidence', 'id'),
    ('supplier_verification_evidence', 'application_id'),
    ('supplier_verification_evidence', 'document_type'),
    ('supplier_verification_evidence', 'private_storage_path'),
    ('supplier_verification_evidence', 'uploaded_at'),
    ('supplier_verification_events', 'id'),
    ('supplier_verification_events', 'application_id'),
    ('supplier_verification_events', 'actor_user_id'),
    ('supplier_verification_events', 'from_status'),
    ('supplier_verification_events', 'to_status'),
    ('supplier_verification_events', 'reason_code'),
    ('supplier_verification_reviewers', 'user_id'),
    ('supplier_verification_reviewers', 'is_active'),
    ('supplier_verification_review_assignments', 'application_id'),
    ('supplier_verification_review_assignments', 'reviewer_user_id'),
    ('supplier_verification_review_assignments', 'is_active'),
    ('supplier_verification_review_assignments', 'revoked_at'),
    ('supplier_verification_assignment_events', 'id'),
    ('supplier_verification_assignment_events', 'application_id'),
    ('supplier_verification_assignment_events', 'assignment_id'),
    ('supplier_verification_assignment_events', 'reviewer_user_id'),
    ('supplier_verification_assignment_events', 'actor_user_id'),
    ('supplier_verification_assignment_events', 'action'),
    ('supplier_verification_assignment_events', 'created_at'),
    ('supplier_verification_admins', 'user_id'),
    ('supplier_verification_admins', 'is_active'),
    ('supplier_verification_admins', 'granted_at'),
    ('supplier_verification_evidence_access_events', 'evidence_id'),
    ('supplier_verification_evidence_access_events', 'application_id'),
    ('supplier_verification_evidence_access_events', 'actor_user_id'),
    ('supplier_verification_evidence_access_events', 'action'),
    ('application_activity', 'id'),
    ('application_activity', 'application_type'),
    ('application_activity', 'application_id'),
    ('application_activity', 'actor_id'),
    ('application_activity', 'recipient_id'),
    ('application_activity', 'event_type'),
    ('application_activity', 'from_status'),
    ('application_activity', 'to_status'),
    ('application_activity', 'created_at')
)
select e.table_name,
       e.column_name,
       exists (
         select 1
         from information_schema.columns c
         where c.table_schema = 'public'
           and c.table_name = e.table_name
           and c.column_name = e.column_name
       ) as exists
from expected e
order by e.table_name, e.column_name;

-- 2) Required helper/RPC functions. Missing rows indicate incomplete migrations.
with expected(function_name) as (
  values
    ('set_updated_at'),
    ('is_supplier_verification_reviewer'),
    ('review_supplier_verification_application'),
    ('can_review_supplier_verification_application'),
    ('admin_set_supplier_verification_reviewer'),
    ('admin_assign_supplier_verification_case'),
    ('admin_revoke_supplier_verification_case'),
    ('normalize_application_activity_status'),
    ('log_application_activity')
)
select e.function_name,
       exists (
         select 1 from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = e.function_name
       ) as exists
from expected e
order by e.function_name;

-- 2b) Privileged functions must be SECURITY DEFINER and pin search_path.
with expected(function_name) as (
  values
    ('is_supplier_verification_reviewer'),
    ('review_supplier_verification_application'),
    ('can_review_supplier_verification_application'),
    ('admin_set_supplier_verification_reviewer'),
    ('admin_assign_supplier_verification_case'),
    ('admin_revoke_supplier_verification_case'),
    ('record_supplier_verification_submission'),
    ('log_application_activity')
)
select e.function_name,
       coalesce(bool_or(p.prosecdef), false) as security_definer,
       coalesce(bool_or(
         exists (
           select 1 from unnest(coalesce(p.proconfig, array[]::text[])) as cfg(setting)
           where cfg.setting like 'search_path=%'
         )
       ), false) as search_path_pinned
from expected e
left join pg_proc p on p.proname = e.function_name
left join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
where p.oid is null or n.oid is not null
group by e.function_name
order by e.function_name;

-- 3) Storage bucket must exist and remain private.
select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'supplier-verification-private';

-- 4) Client grants on sensitive verification tables. Expected: no rows for anon/authenticated.
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'supplier_verification_reviewers',
    'supplier_verification_review_assignments',
    'supplier_verification_assignment_events',
    'supplier_verification_admins',
    'supplier_verification_evidence',
    'supplier_verification_evidence_access_events'
  )
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- 5) Admin allowlist and audit tables must not be exposed to client roles.
select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'supplier_verification_admins',
    'supplier_verification_assignment_events'
  )
order by tablename, policyname;

-- 6) Storage policies relevant to the private evidence bucket.
select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by policyname;

-- Review all result sets manually. A missing column/function, false RLS flag,
-- unpinned privileged function, public bucket, or unexpected client grant is a
-- stop condition. This metadata preflight does not prove runtime RLS behavior.

-- 7) Application activity must have RLS and participant-only read access.
select c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'application_activity';

select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'application_activity'
order by policyname;

-- 8) Expected client privileges: authenticated SELECT only; no anon access and
-- no client INSERT/UPDATE/DELETE. Any extra row is a stop condition.
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'application_activity'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;

-- 9) All four application triggers must exist and call the trusted function.
select event_object_table as table_name, trigger_name, action_timing,
       event_manipulation, action_statement
from information_schema.triggers
where trigger_schema = 'public'
  and trigger_name in (
    'log_investment_application_activity',
    'log_team_application_activity',
    'log_job_application_activity',
    'log_offer_application_activity'
  )
order by event_object_table, trigger_name;
