-- IDEA LAB: moderator approval required before job vacancies are public.
begin;
alter table idea_app.job_posts drop constraint if exists job_posts_status_check;
alter table idea_app.job_posts add constraint job_posts_status_check check(status in ('pending_review','published','closed','rejected'));
alter table idea_app.job_posts alter column status set default 'pending_review';

drop policy if exists job_posts_insert_owner_org on idea_app.job_posts;
create policy job_posts_insert_owner_org on idea_app.job_posts for insert to authenticated
 with check(created_by=(select auth.uid()) and status='pending_review'
  and exists(select 1 from idea_app.organizations o where o.id=organization_id and o.owner_id=(select auth.uid())
   and o.visibility='public' and o.status='active' and o.organization_type<>'team'));
drop policy if exists job_posts_moderator_read on idea_app.job_posts;
create policy job_posts_moderator_read on idea_app.job_posts for select to authenticated
 using(exists(select 1 from public.user_roles ur where ur.user_id=(select auth.uid()) and ur.role in ('admin','moderator')));
drop policy if exists job_posts_moderator_update on idea_app.job_posts;
create policy job_posts_moderator_update on idea_app.job_posts for update to authenticated
 using(exists(select 1 from public.user_roles ur where ur.user_id=(select auth.uid()) and ur.role in ('admin','moderator')))
 with check(exists(select 1 from public.user_roles ur where ur.user_id=(select auth.uid()) and ur.role in ('admin','moderator')));

create or replace function idea_private.guard_job_publication()
returns trigger language plpgsql set search_path='pg_catalog','public'
as $function$
begin
 if new.status='published' then
  if tg_op='INSERT' then
   if current_user not in ('postgres','supabase_admin') and not exists(select 1 from public.user_roles ur where ur.user_id=(select auth.uid()) and ur.role in ('admin','moderator')) then
    raise exception 'Vacancy publication requires moderator approval' using errcode='42501';
   end if;
  elsif old.status is distinct from 'published' then
   if current_user not in ('postgres','supabase_admin') and not exists(select 1 from public.user_roles ur where ur.user_id=(select auth.uid()) and ur.role in ('admin','moderator')) then
    raise exception 'Vacancy publication requires moderator approval' using errcode='42501';
   end if;
  end if;
 end if;
 return new;
end;
$function$;
revoke all on function idea_private.guard_job_publication() from public,anon,authenticated;
drop trigger if exists guard_job_publication on idea_app.job_posts;
create trigger guard_job_publication before insert or update of status on idea_app.job_posts for each row execute function idea_private.guard_job_publication();

create or replace function public.idea_lab_create_job_post(p_organization_id uuid,p_title text,p_description text,p_salary_label text,p_location_label text,p_employment_type text)
returns uuid language plpgsql security invoker set search_path=''
as $function$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_title is null or char_length(btrim(p_title)) not between 3 and 100
  or p_description is null or char_length(btrim(p_description)) not between 10 and 3000
  or p_location_label is null or char_length(btrim(p_location_label)) not between 2 and 120
  or coalesce(char_length(p_salary_label),0)>120
  or p_employment_type not in ('full_time','part_time','remote','internship','freelance') then
  raise exception 'Invalid job post fields' using errcode='22023';
 end if;
 if not exists(select 1 from idea_app.organizations o where o.id=p_organization_id and o.owner_id=auth.uid()
   and o.visibility='public' and o.status='active' and o.organization_type<>'team') then
  raise exception 'Only owners of verified public organizations can submit vacancies' using errcode='42501';
 end if;
 insert into idea_app.job_posts(organization_id,created_by,title,description,salary_label,location_label,employment_type)
 values(p_organization_id,auth.uid(),btrim(p_title),btrim(p_description),coalesce(btrim(p_salary_label),''),btrim(p_location_label),p_employment_type)
 returning id into v_id;
 return v_id;
end;$function$;

create or replace function public.idea_lab_update_job_post_status(p_job_post_id uuid,p_status text)
returns boolean language plpgsql security invoker set search_path=''
as $function$
declare v_count integer;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_status not in ('pending_review','closed') then raise exception 'Invalid owner status' using errcode='22023'; end if;
 update idea_app.job_posts set status=p_status,updated_at=now() where id=p_job_post_id and created_by=auth.uid();
 get diagnostics v_count=row_count;return v_count=1;
end;$function$;

create or replace function public.idea_lab_list_pending_job_posts()
returns table(job_post_id uuid,organization_id uuid,company_name text,title text,description text,salary_label text,location_label text,employment_type text,created_at timestamptz)
language sql stable security invoker set search_path=''
as $function$
 select j.id,j.organization_id,o.name,j.title,j.description,j.salary_label,j.location_label,j.employment_type,j.created_at
 from idea_app.job_posts j join idea_app.organizations o on o.id=j.organization_id where j.status='pending_review'
 and exists(select 1 from public.user_roles ur where ur.user_id=(select auth.uid()) and ur.role in ('admin','moderator'))
 order by j.created_at asc limit 100;
$function$;
create or replace function public.idea_lab_review_job_post(p_job_post_id uuid,p_approve boolean)
returns boolean language plpgsql security invoker set search_path=''
as $function$
declare v_count integer;
begin
 if auth.uid() is null or not exists(select 1 from public.user_roles ur where ur.user_id=(select auth.uid()) and ur.role in ('admin','moderator')) then
  raise exception 'Moderator access required' using errcode='42501';
 end if;
 update idea_app.job_posts set status=case when p_approve then 'published' else 'rejected' end,
  published_at=case when p_approve then now() else published_at end,updated_at=now()
 where id=p_job_post_id and status='pending_review';
 get diagnostics v_count=row_count;return v_count=1;
end;$function$;
revoke all on function public.idea_lab_list_pending_job_posts() from public,anon;
revoke all on function public.idea_lab_review_job_post(uuid,boolean) from public,anon;
grant execute on function public.idea_lab_list_pending_job_posts() to authenticated;
grant execute on function public.idea_lab_review_job_post(uuid,boolean) to authenticated;
commit;
