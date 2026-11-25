-- IDEA LAB: private job seeker resumes and deterministic vacancy matching.
-- Resume data is private to its owner; matching reads only published public vacancies.
begin;
create table if not exists idea_app.job_seeker_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  desired_roles text[] not null default '{}',
  skill_tags text[] not null default '{}',
  experience_years smallint not null default 0,
  experience_summary text not null default '',
  education_summary text not null default '',
  city text,
  employment_types text[] not null default '{full_time}',
  min_salary_uzs bigint,
  max_salary_uzs bigint,
  availability_status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint job_seeker_full_name_len check (char_length(btrim(full_name)) between 2 and 120),
  constraint job_seeker_roles_count check (cardinality(desired_roles) <= 8 and array_position(desired_roles,null) is null),
  constraint job_seeker_skills_count check (cardinality(skill_tags) <= 30 and array_position(skill_tags,null) is null),
  constraint job_seeker_experience_years check (experience_years between 0 and 50),
  constraint job_seeker_experience_summary_len check (char_length(experience_summary) <= 3000),
  constraint job_seeker_education_summary_len check (char_length(education_summary) <= 1600),
  constraint job_seeker_city_len check (city is null or char_length(city) <= 120),
  constraint job_seeker_employment_types check (cardinality(employment_types) between 1 and 5 and employment_types <@ array['full_time','part_time','remote','internship','freelance']::text[]),
  constraint job_seeker_salary_range check ((min_salary_uzs is null or min_salary_uzs >= 0) and (max_salary_uzs is null or max_salary_uzs >= 0) and (min_salary_uzs is null or max_salary_uzs is null or min_salary_uzs <= max_salary_uzs)),
  constraint job_seeker_availability check (availability_status in ('open','limited','unavailable'))
);
create index if not exists job_seeker_profiles_city_idx on idea_app.job_seeker_profiles(lower(city));
alter table idea_app.job_seeker_profiles enable row level security;
drop policy if exists job_seeker_profiles_owner_select on idea_app.job_seeker_profiles;
create policy job_seeker_profiles_owner_select on idea_app.job_seeker_profiles for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists job_seeker_profiles_owner_insert on idea_app.job_seeker_profiles;
create policy job_seeker_profiles_owner_insert on idea_app.job_seeker_profiles for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists job_seeker_profiles_owner_update on idea_app.job_seeker_profiles;
create policy job_seeker_profiles_owner_update on idea_app.job_seeker_profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
grant usage on schema idea_app to authenticated;
grant select, insert, update on idea_app.job_seeker_profiles to authenticated;

create or replace function public.idea_lab_upsert_job_seeker_profile(
 p_full_name text,p_desired_roles text[],p_skill_tags text[],p_experience_years smallint,
 p_experience_summary text,p_education_summary text,p_city text,p_employment_types text[],
 p_min_salary_uzs bigint,p_max_salary_uzs bigint,p_availability_status text
) returns uuid language plpgsql security invoker set search_path=''
as $function$
declare v_user uuid := auth.uid();
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_full_name is null or char_length(btrim(p_full_name)) not between 2 and 120
  or coalesce(cardinality(p_desired_roles),0)>8 or coalesce(cardinality(p_skill_tags),0)>30
  or coalesce(p_experience_years,0) not between 0 and 50
  or char_length(coalesce(p_experience_summary,''))>3000 or char_length(coalesce(p_education_summary,''))>1600
  or char_length(coalesce(p_city,''))>120 or coalesce(cardinality(p_employment_types),0) not between 1 and 5
  or not (p_employment_types <@ array['full_time','part_time','remote','internship','freelance']::text[])
  or (p_min_salary_uzs is not null and p_min_salary_uzs<0)
  or (p_max_salary_uzs is not null and p_max_salary_uzs<0)
  or (p_min_salary_uzs is not null and p_max_salary_uzs is not null and p_min_salary_uzs>p_max_salary_uzs)
  or coalesce(p_availability_status,'open') not in ('open','limited','unavailable')
 then raise exception 'Invalid job seeker profile fields' using errcode='22023'; end if;
 insert into idea_app.job_seeker_profiles(user_id,full_name,desired_roles,skill_tags,experience_years,experience_summary,education_summary,city,employment_types,min_salary_uzs,max_salary_uzs,availability_status)
 values(v_user,btrim(p_full_name),coalesce(p_desired_roles,'{}'),coalesce(p_skill_tags,'{}'),coalesce(p_experience_years,0),coalesce(p_experience_summary,''),coalesce(p_education_summary,''),nullif(btrim(coalesce(p_city,'')),''),p_employment_types,p_min_salary_uzs,p_max_salary_uzs,coalesce(p_availability_status,'open'))
 on conflict(user_id) do update set full_name=excluded.full_name,desired_roles=excluded.desired_roles,skill_tags=excluded.skill_tags,experience_years=excluded.experience_years,experience_summary=excluded.experience_summary,education_summary=excluded.education_summary,city=excluded.city,employment_types=excluded.employment_types,min_salary_uzs=excluded.min_salary_uzs,max_salary_uzs=excluded.max_salary_uzs,availability_status=excluded.availability_status,updated_at=now();
 return v_user;
end;$function$;

create or replace function public.idea_lab_get_my_job_seeker_profile()
returns table(full_name text,desired_roles text[],skill_tags text[],experience_years smallint,experience_summary text,education_summary text,city text,employment_types text[],min_salary_uzs bigint,max_salary_uzs bigint,availability_status text,updated_at timestamptz)
language sql stable security invoker set search_path=''
as $function$
 select p.full_name,p.desired_roles,p.skill_tags,p.experience_years,p.experience_summary,p.education_summary,p.city,p.employment_types,p.min_salary_uzs,p.max_salary_uzs,p.availability_status,p.updated_at
 from idea_app.job_seeker_profiles p where p.user_id=(select auth.uid()) limit 1;
$function$;

create or replace function public.idea_lab_list_matching_jobs()
returns table(id uuid,company_name text,title text,description text,salary_label text,location_label text,employment_type text,published_at timestamptz,match_score integer,match_reasons text[])
language sql stable security invoker set search_path=''
as $function$
 with profile as (
  select * from idea_app.job_seeker_profiles where user_id=(select auth.uid()) and availability_status<>'unavailable'
 ), scored as (
  select j.*,
   exists(select 1 from unnest(p.desired_roles) as roles(role) where lower(j.title) like '%'||lower(roles.role)||'%' or lower(roles.role) like '%'||lower(j.title)||'%') as role_hit,
   case when cardinality(p.skill_tags)=0 then 0 else (select count(*)::numeric from unnest(p.skill_tags) as skills(skill) where lower(j.title||' '||j.description) like '%'||lower(skills.skill)||'%') end as skill_hits,
   cardinality(p.skill_tags) as skill_total,
   (p.city is not null and lower(j.location_label) like '%'||lower(p.city)||'%') as city_hit,
   (j.employment_type=any(p.employment_types)) as type_hit
  from public.idea_lab_public_job_directory j cross join profile p
 ), weighted as (
  select s.*, (case when role_hit then 40 else 0 end + case when skill_total=0 then 0 else round(40*skill_hits/greatest(skill_total,1))::integer end + case when city_hit then 10 else 0 end + case when type_hit then 10 else 0 end) as score
  from scored s
 )
 select w.id,w.company_name,w.title,w.description,w.salary_label,w.location_label,w.employment_type,w.published_at,w.score,
  array_remove(array[case when w.role_hit then 'Kasb yo‘nalishi mos' end,case when w.skill_hits>0 then 'Ko‘nikmalaringizdan '||w.skill_hits::integer||' tasi e’londa uchradi' end,case when w.city_hit then 'Hudud mos' end,case when w.type_hit then 'Bandlik turi mos' end],null)::text[]
 from weighted w order by w.score desc,w.published_at desc limit 50;
$function$;
revoke all on function public.idea_lab_upsert_job_seeker_profile(text,text[],text[],smallint,text,text,text,text[],bigint,bigint,text) from public,anon;
revoke all on function public.idea_lab_get_my_job_seeker_profile() from public,anon;
revoke all on function public.idea_lab_list_matching_jobs() from public,anon;
grant execute on function public.idea_lab_upsert_job_seeker_profile(text,text[],text[],smallint,text,text,text,text[],bigint,bigint,text) to authenticated;
grant execute on function public.idea_lab_get_my_job_seeker_profile() to authenticated;
grant execute on function public.idea_lab_list_matching_jobs() to authenticated;
commit;
