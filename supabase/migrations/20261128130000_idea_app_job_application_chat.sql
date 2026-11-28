-- IDEA LAB career application messaging (participant-only, application-linked).
begin;
create table if not exists idea_app.job_application_messages (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references idea_app.job_applications(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists job_application_messages_app_time_idx
  on idea_app.job_application_messages(application_id, created_at asc);
alter table idea_app.job_application_messages enable row level security;
drop policy if exists job_application_messages_participant_select on idea_app.job_application_messages;
create policy job_application_messages_participant_select on idea_app.job_application_messages
for select to authenticated using (
 sender_id=(select auth.uid()) or exists (
  select 1 from idea_app.job_applications a join idea_app.job_posts j on j.id=a.job_post_id
  where a.id=application_id and (a.applicant_id=(select auth.uid()) or j.created_by=(select auth.uid()))
 )
);
-- RPCs enforce application participation. Direct writes remain unavailable.
grant select on idea_app.job_application_messages to authenticated;
revoke insert, update, delete on idea_app.job_application_messages from anon, authenticated;

create or replace function public.idea_lab_list_my_job_chats()
returns table(application_id uuid, job_title text, company_name text, application_status text, counterpart_label text, last_message text, last_message_at timestamptz)
language sql stable security invoker set search_path=''
as $$
 select a.id,j.title,o.name,a.status,
   case when a.applicant_id=auth.uid() then o.name else coalesce(p.display_name,'Nomzod') end,
   latest.body,latest.created_at
 from idea_app.job_applications a
 join idea_app.job_posts j on j.id=a.job_post_id
 join idea_app.organizations o on o.id=j.organization_id
 left join public.profiles p on p.id=a.applicant_id
 left join lateral (
   select m.body,m.created_at from idea_app.job_application_messages m
   where m.application_id=a.id order by m.created_at desc limit 1
 ) latest on true
 where (a.applicant_id=auth.uid() or j.created_by=auth.uid())
   and a.status not in ('withdrawn','declined')
 order by coalesce(latest.created_at,a.submitted_at) desc
 limit 100;
$$;

create or replace function public.idea_lab_list_job_chat_messages(p_application_id uuid)
returns table(message_id uuid,sender_id uuid,body text,created_at timestamptz)
language sql stable security invoker set search_path=''
as $$
 select m.id,m.sender_id,m.body,m.created_at
 from idea_app.job_application_messages m
 join idea_app.job_applications a on a.id=m.application_id
 join idea_app.job_posts j on j.id=a.job_post_id
 where m.application_id=p_application_id and (a.applicant_id=auth.uid() or j.created_by=auth.uid())
 order by m.created_at asc limit 200;
$$;

create or replace function public.idea_lab_send_job_chat_message(p_application_id uuid,p_body text)
returns uuid language plpgsql security invoker set search_path=''
as $$
declare v_id uuid;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_body is null or char_length(btrim(p_body)) not between 1 and 2000 then
  raise exception 'Message must be 1-2000 characters' using errcode='22023';
 end if;
 if not exists(
  select 1 from idea_app.job_applications a join idea_app.job_posts j on j.id=a.job_post_id
  where a.id=p_application_id and (a.applicant_id=auth.uid() or j.created_by=auth.uid())
    and a.status not in ('withdrawn','declined')
 ) then raise exception 'Application chat not available' using errcode='42501'; end if;
 insert into idea_app.job_application_messages(application_id,sender_id,body)
 values(p_application_id,auth.uid(),btrim(p_body)) returning id into v_id;
 return v_id;
end;
$$;

revoke all on function public.idea_lab_list_my_job_chats() from public,anon;
revoke all on function public.idea_lab_list_job_chat_messages(uuid) from public,anon;
revoke all on function public.idea_lab_send_job_chat_message(uuid,text) from public,anon;
grant execute on function public.idea_lab_list_my_job_chats() to authenticated;
grant execute on function public.idea_lab_list_job_chat_messages(uuid) to authenticated;
grant execute on function public.idea_lab_send_job_chat_message(uuid,text) to authenticated;
commit;
