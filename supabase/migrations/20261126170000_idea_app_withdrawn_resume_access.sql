-- IDEA LAB: stop sharing a candidate's resume with an employer after the candidate withdraws an application.
begin;
drop policy if exists job_seeker_profiles_applied_employer_read on idea_app.job_seeker_profiles;
create policy job_seeker_profiles_applied_employer_read on idea_app.job_seeker_profiles
 for select to authenticated using(exists(
  select 1 from idea_app.job_applications a
  join idea_app.job_posts j on j.id=a.job_post_id
  where a.applicant_id=job_seeker_profiles.user_id
    and j.created_by=(select auth.uid())
    and a.status <> 'withdrawn'
 ));
commit;
