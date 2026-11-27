-- IDEA LAB: add count of openings to public vacancy records
ALTER TABLE idea_app.job_posts
  ADD COLUMN IF NOT EXISTS openings_count smallint NOT NULL DEFAULT 1;
ALTER TABLE idea_app.job_posts
  DROP CONSTRAINT IF EXISTS job_posts_openings_count_check;
ALTER TABLE idea_app.job_posts
  ADD CONSTRAINT job_posts_openings_count_check CHECK (openings_count BETWEEN 1 AND 500);

CREATE OR REPLACE VIEW public.idea_lab_public_job_directory AS
 SELECT j.id, j.organization_id, o.name AS company_name, j.title, j.description,
        j.salary_label, j.location_label, j.employment_type, j.published_at,
        j.required_skills, j.experience_years_min, j.schedule_label, j.openings_count
 FROM idea_app.job_posts j
 JOIN idea_app.organizations o ON o.id=j.organization_id
 WHERE j.status='published' AND o.status='active' AND o.visibility='public';

CREATE OR REPLACE FUNCTION public.idea_lab_create_job_post(
 p_organization_id uuid, p_title text, p_description text, p_salary_label text,
 p_location_label text, p_employment_type text, p_required_skills text[],
 p_experience_years_min smallint, p_schedule_label text, p_openings_count smallint
) RETURNS uuid
LANGUAGE plpgsql SET search_path TO '' AS $function$
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
  or char_length(coalesce(p_schedule_label,''))>160
  or coalesce(p_openings_count,0) not between 1 and 500
 then raise exception 'Invalid job post fields' using errcode='22023'; end if;
 if not exists(select 1 from idea_app.organizations o where o.id=p_organization_id and o.owner_id=auth.uid() and o.visibility='public' and o.status='active' and o.organization_type<>'team') then
  raise exception 'Only owners of active public organizations can submit vacancies' using errcode='42501';
 end if;
 insert into idea_app.job_posts(organization_id,created_by,title,description,salary_label,location_label,employment_type,required_skills,experience_years_min,schedule_label,openings_count)
 values(p_organization_id,auth.uid(),btrim(p_title),btrim(p_description),coalesce(btrim(p_salary_label),''),btrim(p_location_label),p_employment_type,coalesce(p_required_skills,'{}'),coalesce(p_experience_years_min,0),coalesce(btrim(p_schedule_label),''),p_openings_count)
 returning id into v_id;
 return v_id;
end;
$function$;
GRANT EXECUTE ON FUNCTION public.idea_lab_create_job_post(uuid,text,text,text,text,text,text[],smallint,text,smallint) TO authenticated;
