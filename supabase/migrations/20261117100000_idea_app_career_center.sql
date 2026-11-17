-- IDEA LAB career centre: public vacancy directory and private applications.
begin;
create table if not exists idea_app.job_posts (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references idea_app.organizations(id) on delete restrict,
 created_by uuid not null references auth.users(id) on delete cascade,
 title text not null check(char_length(btrim(title)) between 3 and 100),
 description text not null check(char_length(btrim(description)) between 10 and 3000),
 salary_label text not null default '' check(char_length(salary_label)<=120),
 location_label text not null check(char_length(btrim(location_label)) between 2 and 120),
 employment_type text not null check(employment_type in ('full_time','part_time','remote','internship','freelance')),
 status text not null default 'published' check(status in ('published','closed')),
 published_at timestamptz not null default now(), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists job_posts_public_idx on idea_app.job_posts(status,published_at desc);
create index if not exists job_posts_owner_idx on idea_app.job_posts(created_by,created_at desc);
create table if not exists idea_app.job_applications (
 id uuid primary key default gen_random_uuid(),
 job_post_id uuid not null references idea_app.job_posts(id) on delete cascade,
 applicant_id uuid not null references auth.users(id) on delete cascade,
 message text not null check(char_length(btrim(message)) between 10 and 2000),
 status text not null default 'submitted' check(status in ('submitted','accepted','declined','withdrawn')),
 submitted_at timestamptz not null default now(), reviewed_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(job_post_id,applicant_id)
);
create index if not exists job_applications_applicant_idx on idea_app.job_applications(applicant_id,submitted_at desc);
create index if not exists job_applications_post_idx on idea_app.job_applications(job_post_id,submitted_at desc);
alter table idea_app.job_posts enable row level security;
alter table idea_app.job_applications enable row level security;
drop policy if exists job_posts_select_published_or_owner on idea_app.job_posts;
create policy job_posts_select_published_or_owner on idea_app.job_posts for select to anon,authenticated
using(status='published' or created_by=(select auth.uid()));
drop policy if exists job_posts_insert_owner_org on idea_app.job_posts;
create policy job_posts_insert_owner_org on idea_app.job_posts for insert to authenticated
with check(created_by=(select auth.uid()) and exists(select 1 from idea_app.organizations o where o.id=organization_id and o.owner_id=(select auth.uid())));
drop policy if exists job_posts_update_owner on idea_app.job_posts;
create policy job_posts_update_owner on idea_app.job_posts for update to authenticated
using(created_by=(select auth.uid())) with check(created_by=(select auth.uid()));
drop policy if exists job_applications_select_participant on idea_app.job_applications;
create policy job_applications_select_participant on idea_app.job_applications for select to authenticated
using(applicant_id=(select auth.uid()) or exists(select 1 from idea_app.job_posts j where j.id=job_post_id and j.created_by=(select auth.uid())));
drop policy if exists job_applications_insert_self on idea_app.job_applications;
create policy job_applications_insert_self on idea_app.job_applications for insert to authenticated
with check(applicant_id=(select auth.uid()) and status='submitted' and exists(select 1 from idea_app.job_posts j where j.id=job_post_id and j.status='published' and j.created_by<>(select auth.uid())));
drop policy if exists job_applications_update_owner_review on idea_app.job_applications;
create policy job_applications_update_owner_review on idea_app.job_applications for update to authenticated
using(exists(select 1 from idea_app.job_posts j where j.id=job_post_id and j.created_by=(select auth.uid())))
with check(status in ('accepted','declined') and exists(select 1 from idea_app.job_posts j where j.id=job_post_id and j.created_by=(select auth.uid())));
drop policy if exists job_applications_update_applicant_withdraw on idea_app.job_applications;
create policy job_applications_update_applicant_withdraw on idea_app.job_applications for update to authenticated
using(applicant_id=(select auth.uid()) and status='submitted')
with check(applicant_id=(select auth.uid()) and status='withdrawn');
grant usage on schema idea_app to anon,authenticated;
grant select on idea_app.job_posts to anon,authenticated;
grant insert(organization_id,created_by,title,description,salary_label,location_label,employment_type,status,published_at) on idea_app.job_posts to authenticated;
grant update(status,updated_at) on idea_app.job_posts to authenticated;
grant select,insert on idea_app.job_applications to authenticated;
grant update(status,reviewed_at,updated_at) on idea_app.job_applications to authenticated;
create or replace view public.idea_lab_public_job_directory with(security_invoker=true) as
select j.id,j.organization_id,o.name as company_name,j.title,j.description,j.salary_label,j.location_label,j.employment_type,j.published_at
from idea_app.job_posts j join idea_app.organizations o on o.id=j.organization_id
where j.status='published' and o.status='active' and o.visibility='public';
grant select on public.idea_lab_public_job_directory to anon,authenticated;

create or replace function public.idea_lab_create_job_post(p_organization_id uuid,p_title text,p_description text,p_salary_label text,p_location_label text,p_employment_type text)
returns uuid language plpgsql security invoker set search_path=''
as $function$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_title is null or char_length(btrim(p_title)) not between 3 and 100 or p_description is null or char_length(btrim(p_description)) not between 10 and 3000 or p_location_label is null or char_length(btrim(p_location_label)) not between 2 and 120 or coalesce(char_length(p_salary_label),0)>120 or p_employment_type not in ('full_time','part_time','remote','internship','freelance') then
  raise exception 'Invalid job post fields' using errcode='22023';
 end if;
 if not exists(select 1 from idea_app.organizations o where o.id=p_organization_id and o.owner_id=auth.uid()) then raise exception 'Only the organization owner can publish a vacancy' using errcode='42501'; end if;
 insert into idea_app.job_posts(organization_id,created_by,title,description,salary_label,location_label,employment_type)
 values(p_organization_id,auth.uid(),btrim(p_title),btrim(p_description),coalesce(btrim(p_salary_label),''),btrim(p_location_label),p_employment_type) returning id into v_id;
 return v_id;
end;$function$;

create or replace function public.idea_lab_list_my_job_posts()
returns table(job_post_id uuid,organization_id uuid,company_name text,title text,description text,salary_label text,location_label text,employment_type text,status text,published_at timestamptz)
language sql stable security invoker set search_path=''
as $function$
 select j.id,j.organization_id,o.name,j.title,j.description,j.salary_label,j.location_label,j.employment_type,j.status,j.published_at
 from idea_app.job_posts j join idea_app.organizations o on o.id=j.organization_id where j.created_by=auth.uid() order by j.created_at desc limit 100;
$function$;

create or replace function public.idea_lab_update_job_post_status(p_job_post_id uuid,p_status text)
returns boolean language plpgsql security invoker set search_path=''
as $function$
declare v_count integer;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_status not in ('published','closed') then raise exception 'Invalid status' using errcode='22023'; end if;
 update idea_app.job_posts set status=p_status,updated_at=now(),published_at=case when p_status='published' then now() else published_at end where id=p_job_post_id and created_by=auth.uid();
 get diagnostics v_count=row_count; return v_count=1;
end;$function$;

create or replace function public.idea_lab_apply_job_post(p_job_post_id uuid,p_message text)
returns uuid language plpgsql security invoker set search_path=''
as $function$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_message is null or char_length(btrim(p_message)) not between 10 and 2000 then raise exception 'Application message must be 10-2000 characters' using errcode='22023'; end if;
 if not exists(select 1 from idea_app.job_posts j where j.id=p_job_post_id and j.status='published' and j.created_by<>auth.uid()) then raise exception 'Vacancy unavailable' using errcode='42501'; end if;
 insert into idea_app.job_applications(job_post_id,applicant_id,message) values(p_job_post_id,auth.uid(),btrim(p_message)) returning id into v_id; return v_id;
end;$function$;

create or replace function public.idea_lab_list_my_job_applications()
returns table(application_id uuid,job_post_id uuid,company_name text,job_title text,message text,status text,submitted_at timestamptz,reviewed_at timestamptz)
language sql stable security invoker set search_path=''
as $function$
 select a.id,j.id,o.name,j.title,a.message,a.status,a.submitted_at,a.reviewed_at from idea_app.job_applications a join idea_app.job_posts j on j.id=a.job_post_id join idea_app.organizations o on o.id=j.organization_id where a.applicant_id=auth.uid() order by a.submitted_at desc limit 100;
$function$;

create or replace function public.idea_lab_list_job_post_applications(p_job_post_id uuid)
returns table(application_id uuid,job_title text,message text,status text,submitted_at timestamptz)
language sql stable security invoker set search_path=''
as $function$
 select a.id,j.title,a.message,a.status,a.submitted_at from idea_app.job_applications a join idea_app.job_posts j on j.id=a.job_post_id where j.id=p_job_post_id and j.created_by=auth.uid() order by a.submitted_at desc limit 100;
$function$;

create or replace function public.idea_lab_review_job_application(p_application_id uuid,p_status text)
returns boolean language plpgsql security invoker set search_path=''
as $function$
declare v_count integer;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_status not in ('accepted','declined') then raise exception 'Invalid review status' using errcode='22023'; end if;
 update idea_app.job_applications a set status=p_status,reviewed_at=now(),updated_at=now()
 where a.id=p_application_id and a.status='submitted' and exists(select 1 from idea_app.job_posts j where j.id=a.job_post_id and j.created_by=auth.uid());
 get diagnostics v_count=row_count; return v_count=1;
end;$function$;

revoke all on function public.idea_lab_create_job_post(uuid,text,text,text,text,text) from public,anon;
revoke all on function public.idea_lab_list_my_job_posts() from public,anon;
revoke all on function public.idea_lab_update_job_post_status(uuid,text) from public,anon;
revoke all on function public.idea_lab_apply_job_post(uuid,text) from public,anon;
revoke all on function public.idea_lab_list_my_job_applications() from public,anon;
revoke all on function public.idea_lab_list_job_post_applications(uuid) from public,anon;
revoke all on function public.idea_lab_review_job_application(uuid,text) from public,anon;
grant execute on function public.idea_lab_create_job_post(uuid,text,text,text,text,text) to authenticated;
grant execute on function public.idea_lab_list_my_job_posts() to authenticated;
grant execute on function public.idea_lab_update_job_post_status(uuid,text) to authenticated;
grant execute on function public.idea_lab_apply_job_post(uuid,text) to authenticated;
grant execute on function public.idea_lab_list_my_job_applications() to authenticated;
grant execute on function public.idea_lab_list_job_post_applications(uuid) to authenticated;
grant execute on function public.idea_lab_review_job_application(uuid,text) to authenticated;
commit;