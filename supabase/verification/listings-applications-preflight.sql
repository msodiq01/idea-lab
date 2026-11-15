-- Read-only acceptance checks for IDEA LAB listings and applications.
-- Run only after applying to a disposable staging database. No modifications.

select n.nspname as schema_name, c.relname as object_name,
       c.relkind as object_kind, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'idea_app'
  and c.relname in ('project_listings', 'applications', 'public_project_directory', 'public_project_updates')
order by c.relname;

select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'idea_app'
  and tablename in ('project_listings', 'applications', 'projects', 'project_updates')
order by tablename, policyname;

select n.nspname as schema_name, p.proname as function_name,
       p.prosecdef as security_definer, p.proconfig as function_settings,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'idea_private'
  and p.proname = 'guard_application_transition';

select has_schema_privilege('anon', 'idea_app', 'USAGE') as anon_schema_usage,
       has_schema_privilege('authenticated', 'idea_app', 'USAGE') as authenticated_schema_usage,
       has_table_privilege('anon', 'idea_app.public_project_directory', 'SELECT') as anon_directory_select,
       has_table_privilege('anon', 'idea_app.applications', 'SELECT') as anon_applications_select,
       has_table_privilege('authenticated', 'idea_app.applications', 'SELECT') as authenticated_applications_select;
