-- Fix invoker-RPC write permissions for career chat messages.
begin;
drop policy if exists job_application_messages_participant_insert on idea_app.job_application_messages;
create policy job_application_messages_participant_insert on idea_app.job_application_messages
for insert to authenticated
with check (
 sender_id=(select auth.uid()) and exists (
  select 1 from idea_app.job_applications a join idea_app.job_posts j on j.id=a.job_post_id
  where a.id=application_id and (a.applicant_id=(select auth.uid()) or j.created_by=(select auth.uid()))
    and a.status not in ('withdrawn','declined')
 )
);
grant insert on idea_app.job_application_messages to authenticated;
commit;
