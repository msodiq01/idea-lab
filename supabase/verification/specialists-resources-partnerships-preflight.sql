-- Read-only preflight for IDEA LAB specialists/resources/partnerships migration.
-- Run only against a disposable staging database after earlier dependency migrations.
select
  n.nspname as schema_name,
  c.relname as object_name,
  c.relkind as object_kind,
  coalesce(c.relrowsecurity, false) as rls_enabled,
  c.reloptions as relation_options
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('idea_app','idea_private')
  and c.relname in (
    'specialist_profiles','specialist_requests','resource_offers','resource_requests',
    'partnership_opportunities','partnership_enquiries',
    'public_specialist_directory','public_resource_catalogue','public_partnership_directory'
  )
order by n.nspname, c.relname;

select
  p.proname as function_name,
  p.prosecdef as security_definer,
  p.proconfig as function_settings
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'idea_private'
  and p.proname in (
    'is_specialist_profile_owner',
    'is_resource_offer_owner',
    'is_partnership_opportunity_owner',
    'guard_specialist_request_transition',
    'guard_resource_request_transition',
    'guard_partnership_enquiry_transition'
  )
order by p.proname;

select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
from pg_catalog.pg_policies
where schemaname = 'idea_app'
  and tablename in (
    'specialist_profiles','specialist_requests','resource_offers','resource_requests',
    'partnership_opportunities','partnership_enquiries'
  )
order by tablename, policyname;
