-- IDEA LAB: harden resume field validation.
begin;
alter table idea_app.job_seeker_profiles drop constraint if exists job_seeker_roles_count;
alter table idea_app.job_seeker_profiles add constraint job_seeker_roles_count
 check(cardinality(desired_roles) between 1 and 8 and array_position(desired_roles,null) is null);
alter table idea_app.job_seeker_profiles drop constraint if exists job_seeker_employment_types;
alter table idea_app.job_seeker_profiles add constraint job_seeker_employment_types
 check(cardinality(employment_types) between 1 and 5 and array_position(employment_types,null) is null
 and employment_types <@ array['full_time','part_time','remote','internship','freelance']::text[]);

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
  or coalesce(cardinality(p_desired_roles),0) not between 1 and 8
  or exists(select 1 from unnest(coalesce(p_desired_roles,'{}')) as roles(role) where roles.role is null or char_length(btrim(roles.role)) not between 1 and 80)
  or coalesce(cardinality(p_skill_tags),0)>30
  or exists(select 1 from unnest(coalesce(p_skill_tags,'{}')) as skills(skill) where skills.skill is null or char_length(btrim(skills.skill)) not between 1 and 80)
  or coalesce(p_experience_years,0) not between 0 and 50
  or char_length(coalesce(p_experience_summary,''))>3000 or char_length(coalesce(p_education_summary,''))>1600
  or char_length(coalesce(p_city,''))>120 or coalesce(cardinality(p_employment_types),0) not between 1 and 5
  or array_position(p_employment_types,null) is not null
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
end;
$function$;
commit;
