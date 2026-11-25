-- IDEA LAB: moderator-only employer verification queue.
begin;
alter table idea_app.organizations drop constraint if exists organizations_status_check;
alter table idea_app.organizations add constraint organizations_status_check
 check(status in ('draft','pending_review','active','rejected','archived'));

create or replace function idea_private.guard_organization_activation()
returns trigger language plpgsql set search_path='pg_catalog','public'
as $function$
begin
 if new.status='active' and old.status is distinct from 'active'
   and current_user not in ('postgres','supabase_admin')
   and not exists(select 1 from public.user_roles ur where ur.user_id=(select auth.uid()) and ur.role in ('admin','moderator')) then
  raise exception 'Organization activation requires moderator approval' using errcode='42501';
 end if;
 return new;
end;
$function$;
revoke all on function idea_private.guard_organization_activation() from public,anon,authenticated;
drop trigger if exists guard_organization_activation on idea_app.organizations;
create trigger guard_organization_activation before update of status on idea_app.organizations
 for each row execute function idea_private.guard_organization_activation();

drop policy if exists organizations_moderator_read on idea_app.organizations;
create policy organizations_moderator_read on idea_app.organizations for select to authenticated
 using(exists(select 1 from public.user_roles ur where ur.user_id=(select auth.uid()) and ur.role in ('admin','moderator')));
drop policy if exists organizations_moderator_update on idea_app.organizations;
create policy organizations_moderator_update on idea_app.organizations for update to authenticated
 using(exists(select 1 from public.user_roles ur where ur.user_id=(select auth.uid()) and ur.role in ('admin','moderator')))
 with check(exists(select 1 from public.user_roles ur where ur.user_id=(select auth.uid()) and ur.role in ('admin','moderator')));

create or replace function public.idea_lab_is_job_moderator()
returns boolean language sql stable security invoker set search_path=''
as $function$
 select exists(select 1 from public.user_roles ur where ur.user_id=(select auth.uid()) and ur.role in ('admin','moderator'));
$function$;
create or replace function public.idea_lab_list_pending_organizations()
returns table(organization_id uuid,name text,organization_type text,description text,location_label text,website_url text,created_at timestamptz)
language sql stable security invoker set search_path=''
as $function$
 select o.id,o.name,o.organization_type,o.description,o.location_label,o.website_url,o.created_at
 from idea_app.organizations o where o.status='pending_review'
 and exists(select 1 from public.user_roles ur where ur.user_id=(select auth.uid()) and ur.role in ('admin','moderator'))
 order by o.created_at asc limit 100;
$function$;
create or replace function public.idea_lab_review_organization(p_organization_id uuid,p_approve boolean)
returns boolean language plpgsql security invoker set search_path=''
as $function$
declare v_count integer;
begin
 if auth.uid() is null or not exists(select 1 from public.user_roles ur where ur.user_id=(select auth.uid()) and ur.role in ('admin','moderator')) then
  raise exception 'Moderator access required' using errcode='42501';
 end if;
 update idea_app.organizations set status=case when p_approve then 'active' else 'rejected' end,
  visibility=case when p_approve then 'public' else 'private' end,updated_at=now()
 where id=p_organization_id and status='pending_review';
 get diagnostics v_count=row_count; return v_count=1;
end;
$function$;
revoke all on function public.idea_lab_is_job_moderator() from public,anon;
revoke all on function public.idea_lab_list_pending_organizations() from public,anon;
revoke all on function public.idea_lab_review_organization(uuid,boolean) from public,anon;
grant execute on function public.idea_lab_is_job_moderator() to authenticated;
grant execute on function public.idea_lab_list_pending_organizations() to authenticated;
grant execute on function public.idea_lab_review_organization(uuid,boolean) to authenticated;
commit;
