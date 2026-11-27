-- Automatically activate public employer organizations at creation time.
-- "active" means enabled to use IDEA LAB; it does not certify legal identity.
-- Job posts remain pending_review through the job_posts table default.

create or replace function public.idea_lab_create_active_organization(
  p_name text,
  p_slug text,
  p_organization_type text,
  p_description text,
  p_location_label text,
  p_website_url text,
  p_visibility text
)
returns uuid
language plpgsql
set search_path = ''
as $function$
declare
  v_id uuid;
  v_type text := coalesce(p_organization_type, 'other');
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_name is null or length(btrim(p_name)) < 2 or length(btrim(p_name)) > 120
     or length(coalesce(p_description, '')) > 2400
     or length(coalesce(p_location_label, '')) > 120
     or length(coalesce(p_website_url, '')) > 500
     or v_type not in ('company', 'nonprofit', 'educational_institution', 'community', 'other')
     or coalesce(p_visibility, 'public') <> 'public' then
    raise exception 'Invalid public organization details' using errcode = '22023';
  end if;

  insert into idea_app.organizations
    (owner_id, name, slug, organization_type, description, location_label, website_url, visibility, status)
  values
    (auth.uid(), btrim(p_name), nullif(lower(btrim(coalesce(p_slug,''))),''), v_type,
     coalesce(p_description,''), nullif(btrim(coalesce(p_location_label,'')),''),
     nullif(btrim(coalesce(p_website_url,'')),''), 'public', 'active')
  returning id into v_id;

  return v_id;
end;
$function$;

revoke all on function public.idea_lab_create_active_organization(text,text,text,text,text,text,text) from public;
grant execute on function public.idea_lab_create_active_organization(text,text,text,text,text,text,text) to authenticated;

-- Backward compatibility for previously deployed clients.
create or replace function public.idea_lab_submit_organization_for_review(
  p_name text,
  p_slug text,
  p_organization_type text,
  p_description text,
  p_location_label text,
  p_website_url text,
  p_visibility text
)
returns uuid
language sql
set search_path = ''
as $function$
  select public.idea_lab_create_active_organization(
    p_name, p_slug, p_organization_type, p_description,
    p_location_label, p_website_url, p_visibility
  );
$function$;

revoke all on function public.idea_lab_submit_organization_for_review(text,text,text,text,text,text,text) from public;
grant execute on function public.idea_lab_submit_organization_for_review(text,text,text,text,text,text,text) to authenticated;

-- Active is not legal verification; correct the vacancy RPC error text.
create or replace function public.idea_lab_create_job_post(
  p_organization_id uuid,
  p_title text,
  p_description text,
  p_salary_label text,
  p_location_label text,
  p_employment_type text,
  p_required_skills text[],
  p_experience_years_min smallint,
  p_schedule_label text
)
returns uuid
language plpgsql
set search_path = ''
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
  raise exception 'Only owners of active public organizations can submit vacancies' using errcode='42501';
 end if;
 insert into idea_app.job_posts(organization_id,created_by,title,description,salary_label,location_label,employment_type,required_skills,experience_years_min,schedule_label)
 values(p_organization_id,auth.uid(),btrim(p_title),btrim(p_description),coalesce(btrim(p_salary_label),''),btrim(p_location_label),p_employment_type,coalesce(p_required_skills,'{}'),coalesce(p_experience_years_min,0),coalesce(btrim(p_schedule_label),'')) 
 returning id into v_id;
 return v_id;
end;
$function$;

-- Previously submitted public employer profiles now become active as well.
update idea_app.organizations
set status = 'active', updated_at = now()
where status = 'pending_review'
  and visibility = 'public'
  and organization_type = 'company';
