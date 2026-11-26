-- IDEA LAB: withdrawn applicants and their application message are no longer visible to employers.
begin;

drop policy if exists job_applications_select_participant on idea_app.job_applications;
create policy job_applications_select_participant on idea_app.job_applications
 for select to authenticated
 using (
  applicant_id=(select auth.uid())
  or (
   status <> 'withdrawn'
   and exists (
    select 1 from idea_app.job_posts j
    where j.id=job_applications.job_post_id
      and j.created_by=(select auth.uid())
   )
  )
 );

commit;
