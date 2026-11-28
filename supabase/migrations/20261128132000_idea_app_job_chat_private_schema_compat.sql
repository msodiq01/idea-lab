-- Keep chat list RPC compatible with the private organization/profile tables.
-- The authenticated browser role has no direct grants on those tables.
begin;
create or replace function public.idea_lab_list_my_job_chats()
returns table(application_id uuid, job_title text, company_name text, application_status text, counterpart_label text, last_message text, last_message_at timestamptz)
language sql stable security invoker set search_path=''
as $$
 select a.id,j.title,'Ish beruvchi'::text,a.status,
   case when a.applicant_id=auth.uid() then 'Ish beruvchi'::text else 'Nomzod'::text end,
   latest.body,latest.created_at
 from idea_app.job_applications a
 join idea_app.job_posts j on j.id=a.job_post_id
 left join lateral (
   select m.body,m.created_at from idea_app.job_application_messages m
   where m.application_id=a.id order by m.created_at desc limit 1
 ) latest on true
 where (a.applicant_id=auth.uid() or j.created_by=auth.uid())
   and a.status not in ('withdrawn','declined')
 order by coalesce(latest.created_at,a.submitted_at) desc
 limit 100;
$$;
commit;
