-- IDEA LAB: share a candidate's resume only with employers receiving their application.
begin;
drop policy if exists job_seeker_profiles_applied_employer_read on idea_app.job_seeker_profiles;
create policy job_seeker_profiles_applied_employer_read on idea_app.job_seeker_profiles
 for select to authenticated using(exists(
  select 1 from idea_app.job_applications a join idea_app.job_posts j on j.id=a.job_post_id
  where a.applicant_id=job_seeker_profiles.user_id and j.created_by=(select auth.uid())
 ));
drop function if exists public.idea_lab_list_job_post_applications(uuid);
create function public.idea_lab_list_job_post_applications(p_job_post_id uuid)
returns table(application_id uuid,job_title text,message text,status text,submitted_at timestamptz,
 candidate_name text,candidate_city text,candidate_roles text[],candidate_skills text[],
 candidate_experience_years smallint,candidate_experience_summary text,candidate_education_summary text)
language sql stable security invoker set search_path=''
as $function$
 select a.id,j.title,a.message,a.status,a.submitted_at,p.full_name,p.city,p.desired_roles,p.skill_tags,
  p.experience_years,p.experience_summary,p.education_summary
 from idea_app.job_applications a join idea_app.job_posts j on j.id=a.job_post_id
 left join idea_app.job_seeker_profiles p on p.user_id=a.applicant_id
 where j.id=p_job_post_id and j.created_by=(select auth.uid())
 order by a.submitted_at desc limit 100;
$function$;
revoke all on function public.idea_lab_list_job_post_applications(uuid) from public,anon;
grant execute on function public.idea_lab_list_job_post_applications(uuid) to authenticated;
commit;
