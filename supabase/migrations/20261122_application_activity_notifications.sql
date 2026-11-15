-- IDEA LAB: server-side application activity and participant notifications.
-- Review and apply only to a confirmed Supabase staging project after backup.
-- This migration is intentionally not deployed by repository changes.

begin;

create table if not exists public.application_activity (
  id uuid primary key default gen_random_uuid(),
  application_type text not null check (application_type in ('investment', 'team', 'job', 'offer')),
  application_id uuid not null,
  actor_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('submitted', 'status_changed')),
  from_status text,
  to_status text not null,
  created_at timestamptz not null default now(),
  constraint application_activity_distinct_participants check (actor_id <> recipient_id)
);

create index if not exists application_activity_recipient_created_idx
  on public.application_activity (recipient_id, created_at desc);
create index if not exists application_activity_application_created_idx
  on public.application_activity (application_type, application_id, created_at desc);

alter table public.application_activity enable row level security;

drop policy if exists "Application participants can view activity" on public.application_activity;
create policy "Application participants can view activity"
  on public.application_activity for select to authenticated
  using (actor_id = auth.uid() or recipient_id = auth.uid());

-- No INSERT, UPDATE or DELETE policy is created. Activity rows are written only
-- by the trusted trigger below; clients cannot forge or rewrite audit events.
revoke all on public.application_activity from anon, authenticated;
grant select on public.application_activity to authenticated;

create or replace function public.normalize_application_activity_status(p_status text)
returns text
language sql
immutable
set search_path = pg_catalog, public
as $$
  select case lower(trim(coalesce(p_status, '')))
    when 'new' then 'submitted'
    when 'yangi' then 'submitted'
    when 'submitted' then 'submitted'
    when 'ko‘rib chiqilmoqda' then 'reviewing'
    when 'ko''rib chiqilmoqda' then 'reviewing'
    when 'reviewing' then 'reviewing'
    when 'suhbat belgilandi' then 'interview'
    when 'interview' then 'interview'
    when 'qabul qilindi' then 'accepted'
    when 'accepted' then 'accepted'
    when 'muzokara' then 'negotiating'
    when 'negotiating' then 'negotiating'
    when 'kelishildi' then 'agreed'
    when 'agreed' then 'agreed'
    when 'jarayonda' then 'in_progress'
    when 'in_progress' then 'in_progress'
    when 'yakunlandi' then 'completed'
    when 'completed' then 'completed'
    when 'rad etildi' then 'rejected'
    when 'rejected' then 'rejected'
    when 'qaytarib olindi' then 'withdrawn'
    when 'withdrawn' then 'withdrawn'
    when 'bekor qilindi' then 'cancelled'
    when 'cancelled' then 'cancelled'
    else lower(trim(coalesce(p_status, 'submitted')))
  end;
$$;

create or replace function public.log_application_activity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_actor uuid := auth.uid();
  v_applicant uuid;
  v_owner uuid;
  v_recipient uuid;
  v_type text := tg_argv[0];
  v_applicant_column text := tg_argv[1];
  v_target_table text := tg_argv[2];
  v_target_column text := tg_argv[3];
  v_target_id uuid;
  v_from text;
  v_to text;
  v_event text;
begin
  v_applicant := nullif(to_jsonb(new)->>v_applicant_column, '')::uuid;
  v_target_id := nullif(to_jsonb(new)->>v_target_column, '')::uuid;

  execute format('select owner_id from public.%I where id = $1', v_target_table)
    into v_owner using v_target_id;

  if v_applicant is null or v_owner is null then
    raise exception 'Application participants could not be resolved';
  end if;

  if tg_op = 'INSERT' then
    if v_actor is distinct from v_applicant then
      raise exception 'Only the applicant may submit this application';
    end if;
    v_recipient := v_owner;
    v_event := 'submitted';
    v_from := null;
    v_to := public.normalize_application_activity_status(new.status);
  else
    v_from := public.normalize_application_activity_status(old.status);
    v_to := public.normalize_application_activity_status(new.status);
    if v_from = v_to then
      return new;
    end if;
    if v_actor = v_applicant then
      v_recipient := v_owner;
    elsif v_actor = v_owner then
      v_recipient := v_applicant;
    else
      raise exception 'Only application participants may change its status';
    end if;
    v_event := 'status_changed';
  end if;

  if v_actor is null or v_actor = v_recipient then
    raise exception 'Authenticated application actor is required';
  end if;

  insert into public.application_activity (
    application_type, application_id, actor_id, recipient_id,
    event_type, from_status, to_status
  ) values (
    v_type, new.id, v_actor, v_recipient, v_event, v_from, v_to
  );

  return new;
end;
$$;

drop trigger if exists log_investment_application_activity on public.project_investment_applications;
create trigger log_investment_application_activity
  after insert or update of status on public.project_investment_applications
  for each row execute function public.log_application_activity('investment', 'investor_user_id', 'projects', 'project_id');

drop trigger if exists log_team_application_activity on public.team_applications;
create trigger log_team_application_activity
  after insert or update of status on public.team_applications
  for each row execute function public.log_application_activity('team', 'applicant_id', 'teams', 'team_id');

drop trigger if exists log_job_application_activity on public.job_applications;
create trigger log_job_application_activity
  after insert or update of status on public.job_applications
  for each row execute function public.log_application_activity('job', 'applicant_id', 'job_posts', 'job_id');

drop trigger if exists log_offer_application_activity on public.offer_applications;
create trigger log_offer_application_activity
  after insert or update of status on public.offer_applications
  for each row execute function public.log_application_activity('offer', 'applicant_id', 'offers', 'offer_id');

commit;
