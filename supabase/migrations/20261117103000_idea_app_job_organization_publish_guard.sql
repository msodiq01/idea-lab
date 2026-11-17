-- Only publicly visible, active non-team organizations can publish job vacancies.
drop policy if exists job_posts_insert_owner_org on idea_app.job_posts;
create policy job_posts_insert_owner_org on idea_app.job_posts
for insert to authenticated
with check (
  created_by=(select auth.uid())
  and exists (
    select 1 from idea_app.organizations o
    where o.id=organization_id
      and o.owner_id=(select auth.uid())
      and o.visibility='public'
      and o.status='active'
      and o.organization_type<>'team'
  )
);
create or replace function public.idea_lab_create_job_post(
 p_organization_id uuid,p_title text,p_description text,p_salary_label text,
 p_location_label text,p_employment_type text
) returns uuid
language plpgsql security invoker set search_path=''
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
 if not exists(
   select 1 from idea_app.organizations o
   where o.id=p_organization_id and o.owner_id=auth.uid()
     and o.visibility='public' and o.status='active' and o.organization_type<>'team'
 ) then
   raise exception 'Only owners of active public non-team organizations can publish vacancies' using errcode='42501';
 end if;
 insert into idea_app.job_posts(organization_id,created_by,title,description,salary_label,location_label,employment_type)
 values(p_organization_id,auth.uid(),btrim(p_title),btrim(p_description),coalesce(btrim(p_salary_label),''),btrim(p_location_label),p_employment_type)
 returning id into v_id;
 return v_id;
end;
$function$;