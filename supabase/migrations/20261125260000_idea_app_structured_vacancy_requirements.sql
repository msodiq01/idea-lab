-- IDEA LAB: structured vacancy requirements and stronger deterministic matching.
begin;
alter table idea_app.job_posts add column if not exists required_skills text[] not null default '{}';
alter table idea_app.job_posts add column if not exists experience_years_min smallint not null default 0;
alter table idea_app.job_posts add column if not exists schedule_label text not null default '';
alter table idea_app.job_posts drop constraint if exists job_posts_required_skills_check;
alter table idea_app.job_posts add constraint job_posts_required_skills_check check(cardinality(required_skills)<=20 and array_position(required_skills,null) is null);
alter table idea_app.job_posts drop constraint if exists job_posts_experience_years_min_check;
alter table idea_app.job_posts add constraint job_posts_experience_years_min_check check(experience_years_min between 0 and 50);
alter table idea_app.job_posts drop constraint if exists job_posts_schedule_label_check;
alter table idea_app.job_posts add constraint job_posts_schedule_label_check check(char_length(schedule_label)<=160);

create or replace view public.idea_lab_public_job_directory with(security_invoker=true) as
select j.id,j.organization_id,o.name as company_name,j.title,j.description,j.salary_label,j.location_label,j.employment_type,j.published_at,j.required_skills,j.experience_years_min,j.schedule_label
from idea_app.job_posts j join idea_app.organizations o on o.id=j.organization_id
where j.status='published' and o.status='active' and o.visibility='public';
grant select on public.idea_lab_public_job_directory to anon,authenticated;

drop function if exists public.idea_lab_create_job_post(uuid,text,text,text,text,text);
create function public.idea_lab_create_job_post(p_organization_id uuid,p_title text,p_description text,p_salary_label text,p_location_label text,p_employment_type text,p_required_skills text[],p_experience_years_min smallint,p_schedule_label text)
returns uuid language plpgsql security invoker set search_path=''
as $function$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_title is null or char_length(btrim(p_title)) not between 3 and 100
  or p_description is null or char_length(btrim(p_description)) not between 10 and 3000
  or p_location_label is null or char_length(btrim(p_location_label)) not between 2 and 120
  or coalesce(char_length(p_salary_label),0)>120
  or p_employment_type not in ('full_time','part_time','remote','internship','freelance')
  or coalesce(cardinality(p_required_skills),0)>20
  or exists(select 1 from unnest(coalesce(p_required_skills,'{}')) as s(skill) where s.skill is null or char_length(btrim(s.skill)) not between 1 and 80)
  or coalesce(p_experience_years_min,0) not between 0 and 50
  or char_length(coalesce(p_schedule_label,''))>160 then raise exception 'Invalid job post fields' using errcode='22023'; end if;
 if not exists(select 1 from idea_app.organizations o where o.id=p_organization_id and o.owner_id=auth.uid() and o.visibility='public' and o.status='active' and o.organization_type<>'team') then
  raise exception 'Only owners of verified public organizations can submit vacancies' using errcode='42501';
 end if;
 insert into idea_app.job_posts(organization_id,created_by,title,description,salary_label,location_label,employment_type,required_skills,experience_years_min,schedule_label)
 values(p_organization_id,auth.uid(),btrim(p_title),btrim(p_description),coalesce(btrim(p_salary_label),''),btrim(p_location_label),p_employment_type,coalesce(p_required_skills,'{}'),coalesce(p_experience_years_min,0),coalesce(btrim(p_schedule_label),''))
 returning id into v_id; return v_id;
end;$function$;
revoke all on function public.idea_lab_create_job_post(uuid,text,text,text,text,text,text[],smallint,text) from public,anon;
grant execute on function public.idea_lab_create_job_post(uuid,text,text,text,text,text,text[],smallint,text) to authenticated;

drop function if exists public.idea_lab_list_my_job_posts();
create function public.idea_lab_list_my_job_posts()
returns table(job_post_id uuid,organization_id uuid,company_name text,title text,description text,salary_label text,location_label text,employment_type text,status text,published_at timestamptz,required_skills text[],experience_years_min smallint,schedule_label text)
language sql stable security invoker set search_path=''
as $function$
 select j.id,j.organization_id,o.name,j.title,j.description,j.salary_label,j.location_label,j.employment_type,j.status,j.published_at,j.required_skills,j.experience_years_min,j.schedule_label
 from idea_app.job_posts j join idea_app.organizations o on o.id=j.organization_id where j.created_by=(select auth.uid()) order by j.created_at desc limit 100;
$function$;
revoke all on function public.idea_lab_list_my_job_posts() from public,anon;
grant execute on function public.idea_lab_list_my_job_posts() to authenticated;

drop function if exists public.idea_lab_list_pending_job_posts();
create function public.idea_lab_list_pending_job_posts()
returns table(job_post_id uuid,organization_id uuid,company_name text,title text,description text,salary_label text,location_label text,employment_type text,created_at timestamptz,required_skills text[],experience_years_min smallint,schedule_label text)
language sql stable security invoker set search_path=''
as $function$
 select j.id,j.organization_id,o.name,j.title,j.description,j.salary_label,j.location_label,j.employment_type,j.created_at,j.required_skills,j.experience_years_min,j.schedule_label
 from idea_app.job_posts j join idea_app.organizations o on o.id=j.organization_id where j.status='pending_review'
 and exists(select 1 from public.user_roles ur where ur.user_id=(select auth.uid()) and ur.role in ('admin','moderator')) order by j.created_at asc limit 100;
$function$;
revoke all on function public.idea_lab_list_pending_job_posts() from public,anon;
grant execute on function public.idea_lab_list_pending_job_posts() to authenticated;

drop function if exists public.idea_lab_list_matching_jobs();
create function public.idea_lab_list_matching_jobs()
returns table(id uuid,company_name text,title text,description text,salary_label text,location_label text,employment_type text,published_at timestamptz,required_skills text[],experience_years_min smallint,schedule_label text,match_score integer,match_reasons text[])
language sql stable security invoker set search_path=''
as $function$
 with profile as (select * from idea_app.job_seeker_profiles where user_id=(select auth.uid()) and availability_status<>'unavailable'),
 scored as (
  select j.*,
   exists(select 1 from unnest(p.desired_roles) as roles(role) where lower(j.title) like '%'||lower(roles.role)||'%' or lower(roles.role) like '%'||lower(j.title)||'%') as role_hit,
   case when cardinality(j.required_skills)>0 then
    (select count(*)::numeric from unnest(j.required_skills) as req(skill) where exists(select 1 from unnest(p.skill_tags) as mine(skill) where lower(mine.skill)=lower(req.skill)))
   when cardinality(p.skill_tags)>0 then
    (select count(*)::numeric from unnest(p.skill_tags) as mine(skill) where lower(j.title||' '||j.description) like '%'||lower(mine.skill)||'%')
   else 0 end as skill_hits,
   case when cardinality(j.required_skills)>0 then cardinality(j.required_skills) else cardinality(p.skill_tags) end as skill_total,
   (p.experience_years>=j.experience_years_min) as experience_hit,
   (p.city is not null and lower(j.location_label) like '%'||lower(p.city)||'%') as city_hit,
   (j.employment_type=any(p.employment_types)) as type_hit
  from public.idea_lab_public_job_directory j cross join profile p
 ), weighted as (
  select s.*,(case when role_hit then 30 else 0 end
   +case when skill_total=0 then 0 else round(35*skill_hits/greatest(skill_total,1))::integer end
   +case when experience_hit then 15 else 0 end
   +case when city_hit then 10 else 0 end
   +case when type_hit then 10 else 0 end) as score from scored s
 )
 select w.id,w.company_name,w.title,w.description,w.salary_label,w.location_label,w.employment_type,w.published_at,w.required_skills,w.experience_years_min,w.schedule_label,w.score,
  array_remove(array[case when w.role_hit then 'Kasb yo‘nalishi mos' end,case when w.skill_hits>0 then 'Talab qilingan ko‘nikmalardan '||w.skill_hits::integer||' tasi mos' end,case when w.experience_hit then 'Tajriba talabi mos' end,case when w.city_hit then 'Hudud mos' end,case when w.type_hit then 'Bandlik turi mos' end],null)::text[]
 from weighted w order by w.score desc,w.published_at desc limit 50;
$function$;
revoke all on function public.idea_lab_list_matching_jobs() from public,anon;
grant execute on function public.idea_lab_list_matching_jobs() to authenticated;
commit;
