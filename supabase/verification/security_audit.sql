-- IDEA LAB Supabase security audit
-- Read-only queries. Run AFTER applying schema + hardening migration in a TEST project.
-- These queries inspect metadata; they do not create, update, or delete application data.

-- 1) RLS status for core tables.
select n.nspname as schema_name, c.relname as table_name,
       c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'profiles','projects','teams','job_posts','specialist_profiles','offers',
    'investors','resources','project_investment_applications','team_applications',
    'job_applications','offer_applications','offer_messages','resource_orders',
    'project_tasks'
  )
order by c.relname;

-- 2) Public directory view columns. Review output for private fields.
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'projects_public','teams_public','job_posts_public',
    'specialist_profiles_public','offers_public','investors_public','resources_public'
  )
order by table_name, ordinal_position;

-- 3) View grants by role.
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'projects_public','teams_public','job_posts_public',
    'specialist_profiles_public','offers_public','investors_public','resources_public'
  )
order by table_name, grantee, privilege_type;

-- 4) Policies on application and profile tables.
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles','project_investment_applications','team_applications',
    'job_applications','offer_applications','resource_orders','offer_messages'
  )
order by tablename, policyname;

-- 5) Security-definer/invoker view metadata. Inspect owner and options.
select schemaname, viewname, viewowner, definition
from pg_views
where schemaname = 'public'
  and viewname like '%\_public' escape '\'
order by viewname;
