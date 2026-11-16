-- IDEA LAB Storage preflight
-- READ ONLY. Run only after the private Storage migration is applied to disposable staging.
-- This query set verifies bucket configuration, policy coverage, and browser-role privileges.

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'idea-user-assets';

select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname like 'idea_user_assets_%'
order by policyname;

select
  has_table_privilege('anon', 'storage.objects', 'SELECT') as anon_select_privilege,
  has_table_privilege('anon', 'storage.objects', 'INSERT') as anon_insert_privilege,
  has_table_privilege('anon', 'storage.objects', 'UPDATE') as anon_update_privilege,
  has_table_privilege('anon', 'storage.objects', 'DELETE') as anon_delete_privilege,
  has_table_privilege('authenticated', 'storage.objects', 'SELECT') as authenticated_select_privilege,
  has_table_privilege('authenticated', 'storage.objects', 'INSERT') as authenticated_insert_privilege,
  has_table_privilege('authenticated', 'storage.objects', 'UPDATE') as authenticated_update_privilege,
  has_table_privilege('authenticated', 'storage.objects', 'DELETE') as authenticated_delete_privilege;

select
  count(*) filter (where policyname = 'idea_user_assets_select_own' and cmd = 'SELECT') as select_policy_count,
  count(*) filter (where policyname = 'idea_user_assets_insert_own' and cmd = 'INSERT') as insert_policy_count,
  count(*) filter (where policyname = 'idea_user_assets_update_own' and cmd = 'UPDATE') as update_policy_count,
  count(*) filter (where policyname = 'idea_user_assets_delete_own' and cmd = 'DELETE') as delete_policy_count,
  count(*) filter (where 'anon' = any(roles)) as anon_policy_count
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname like 'idea_user_assets_%';
