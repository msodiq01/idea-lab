-- IDEA LAB supplier verification staging preflight
-- READ ONLY. Run only after applying schema.sql and migrations through 20261121
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
    ('supplier_verification_evidence_access_events')
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

-- 2) Required helper/RPC functions. Missing rows indicate incomplete migrations.
with expected(function_name) as (
  values
    ('set_updated_at'),
    ('is_supplier_verification_reviewer'),
    ('review_supplier_verification_application'),
    ('admin_set_supplier_verification_reviewer'),
    ('admin_assign_supplier_verification_case'),
    ('admin_revoke_supplier_verification_case')
)
select e.function_name,
       exists (
         select 1 from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = e.function_name
       ) as exists
from expected e
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

-- Review all result sets manually. This is a metadata preflight, not proof that
-- the full RLS, RPC, Storage, or Edge Function behavior is correct.
