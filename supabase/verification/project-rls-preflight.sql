-- Read-only verification for IDEA LAB project RLS migration.
-- Run only after applying to a disposable staging database. No modifications.

select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'idea_app' and c.relkind = 'r'
order by c.relname;

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'idea_app'
order by tablename, policyname;

select n.nspname as schema_name, p.proname as function_name,
       p.prosecdef as security_definer, p.proconfig as function_settings,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'idea_private'
  and p.proname in ('is_project_owner', 'has_active_project_role', 'is_organization_owner', 'is_active_project_member', 'enforce_project_member_transition', 'validate_project_task_assignee')
order by p.proname;

select has_schema_privilege('anon', 'idea_app', 'USAGE') as anon_app_schema_usage,
       has_schema_privilege('authenticated', 'idea_app', 'USAGE') as authenticated_app_schema_usage,
       has_schema_privilege('anon', 'idea_private', 'USAGE') as anon_private_schema_usage,
       has_schema_privilege('authenticated', 'idea_private', 'USAGE') as authenticated_private_schema_usage,
       has_table_privilege('anon', 'idea_app.projects', 'SELECT') as anon_projects_select,
       has_table_privilege('authenticated', 'idea_app.projects', 'SELECT') as authenticated_projects_select,
       has_table_privilege('authenticated', 'idea_app.projects', 'INSERT') as authenticated_projects_insert;
