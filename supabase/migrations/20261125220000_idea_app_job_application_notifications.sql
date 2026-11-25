-- IDEA LAB: private in-app notifications for IDEA APP job applications.
begin;
create table if not exists idea_app.job_application_activity (
 id uuid primary key default gen_random_uuid(),
 application_id uuid not null references idea_app.job_applications(id) on delete cascade,
 actor_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 event_type text not null check(event_type in ('submitted','status_changed')),
 from_status text,
 to_status text not null check(to_status in ('submitted','accepted','declined','withdrawn')),
 job_title text not null default '',
 company_name text not null default '',
 created_at timestamptz not null default now(),
 read_at timestamptz,
 constraint job_application_activity_distinct_users check(actor_id<>recipient_id)
);
alter table idea_app.job_application_activity add column if not exists job_title text not null default '';
alter table idea_app.job_application_activity add column if not exists company_name text not null default '';
create index if not exists job_application_activity_recipient_idx on idea_app.job_application_activity(recipient_id,created_at desc);
alter table idea_app.job_application_activity enable row level security;
drop policy if exists job_application_activity_participant_read on idea_app.job_application_activity;
create policy job_application_activity_participant_read on idea_app.job_application_activity for select to authenticated
 using(actor_id=(select auth.uid()) or recipient_id=(select auth.uid()));
drop policy if exists job_application_activity_recipient_update on idea_app.job_application_activity;
create policy job_application_activity_recipient_update on idea_app.job_application_activity for update to authenticated
 using(recipient_id=(select auth.uid())) with check(recipient_id=(select auth.uid()));
grant usage on schema idea_app to authenticated;
grant select on idea_app.job_application_activity to authenticated;
grant update(read_at) on idea_app.job_application_activity to authenticated;

create or replace function idea_private.log_idea_job_application_activity()
returns trigger language plpgsql security definer set search_path=''
as $function$
declare v_actor uuid:=auth.uid(); v_applicant uuid; v_owner uuid; v_recipient uuid;
 v_from text; v_to text; v_event text; v_title text; v_company text;
begin
 v_applicant:=new.applicant_id;
 select j.created_by,j.title,o.name into v_owner,v_title,v_company
 from idea_app.job_posts j join idea_app.organizations o on o.id=j.organization_id where j.id=new.job_post_id;
 if v_actor is null or v_applicant is null or v_owner is null then raise exception 'Authenticated application participants could not be resolved'; end if;
 if tg_op='INSERT' then
  if v_actor is distinct from v_applicant then raise exception 'Only applicant may submit application'; end if;
  v_recipient:=v_owner;v_event:='submitted';v_from:=null;v_to:=new.status;
 else
  v_from:=old.status;v_to:=new.status;
  if v_from is not distinct from v_to then return new; end if;
  if v_actor=v_applicant then v_recipient:=v_owner;
  elsif v_actor=v_owner then v_recipient:=v_applicant;
  else raise exception 'Only application participants may change status'; end if;
  v_event:='status_changed';
 end if;
 if v_actor=v_recipient then raise exception 'Application activity recipient must differ from actor'; end if;
 insert into idea_app.job_application_activity(application_id,actor_id,recipient_id,event_type,from_status,to_status,job_title,company_name)
 values(new.id,v_actor,v_recipient,v_event,v_from,v_to,coalesce(v_title,''),coalesce(v_company,''));
 return new;
end;$function$;
revoke all on function idea_private.log_idea_job_application_activity() from public,anon,authenticated;
drop trigger if exists log_idea_job_application_insert on idea_app.job_applications;
create trigger log_idea_job_application_insert after insert on idea_app.job_applications for each row execute function idea_private.log_idea_job_application_activity();
drop trigger if exists log_idea_job_application_status on idea_app.job_applications;
create trigger log_idea_job_application_status after update of status on idea_app.job_applications for each row execute function idea_private.log_idea_job_application_activity();

drop function if exists public.idea_lab_list_my_job_activity();
create function public.idea_lab_list_my_job_activity()
returns table(activity_id uuid,application_id uuid,event_type text,from_status text,to_status text,job_title text,company_name text,created_at timestamptz,read_at timestamptz)
language sql stable security invoker set search_path=''
as $function$
 select a.id,a.application_id,a.event_type,a.from_status,a.to_status,a.job_title,a.company_name,a.created_at,a.read_at
 from idea_app.job_application_activity a where a.recipient_id=(select auth.uid()) order by a.created_at desc limit 100;
$function$;
create or replace function public.idea_lab_mark_job_activity_read(p_activity_id uuid)
returns boolean language plpgsql security invoker set search_path=''
as $function$
declare v_count integer;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
 update idea_app.job_application_activity set read_at=now() where id=p_activity_id and recipient_id=auth.uid() and read_at is null;
 get diagnostics v_count=row_count;return v_count=1;
end;$function$;
revoke all on function public.idea_lab_list_my_job_activity() from public,anon;
revoke all on function public.idea_lab_mark_job_activity_read(uuid) from public,anon;
grant execute on function public.idea_lab_list_my_job_activity() to authenticated;
grant execute on function public.idea_lab_mark_job_activity_read(uuid) to authenticated;
commit;
