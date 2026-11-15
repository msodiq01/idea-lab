-- IDEA LAB trusted administrator control plane for supplier verification.
-- Bootstrap administrators manually through a trusted database owner process.
-- Never expose service_role credentials or admin allowlist writes to clients.

begin;

create table if not exists public.supplier_verification_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  granted_at timestamptz not null default now(),
  note text,
  constraint supplier_verification_admin_note_check check (note is null or length(note) <= 240)
);

create table if not exists public.supplier_verification_assignment_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.supplier_verification_applications(id) on delete set null,
  assignment_id uuid,
  reviewer_user_id uuid references auth.users(id) on delete set null,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in ('reviewer_activated','reviewer_deactivated','case_assigned','case_assignment_revoked')),
  note text,
  created_at timestamptz not null default now(),
  constraint supplier_verification_assignment_event_note_check check (note is null or length(note) <= 240)
);

create index if not exists supplier_verification_assignment_events_application_idx
  on public.supplier_verification_assignment_events(application_id, created_at desc);
create index if not exists supplier_verification_assignment_events_reviewer_idx
  on public.supplier_verification_assignment_events(reviewer_user_id, created_at desc);

alter table public.supplier_verification_admins enable row level security;
alter table public.supplier_verification_assignment_events enable row level security;
revoke all on public.supplier_verification_admins from public, anon, authenticated;
revoke all on public.supplier_verification_assignment_events from public, anon, authenticated;
grant all on public.supplier_verification_admins to service_role;
grant all on public.supplier_verification_assignment_events to service_role;

create or replace function public.admin_set_supplier_verification_reviewer(
  p_actor_user_id uuid,
  p_reviewer_user_id uuid,
  p_is_active boolean,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_action text;
begin
  if not exists (
    select 1 from public.supplier_verification_admins a
    where a.user_id = p_actor_user_id and a.is_active = true
  ) then
    raise exception 'Administrator permission required' using errcode = '42501';
  end if;
  if p_reviewer_user_id is null or p_is_active is null then
    raise exception 'Reviewer and active state are required' using errcode = '22023';
  end if;
  if p_note is not null and length(p_note) > 240 then
    raise exception 'Note is too long' using errcode = '22023';
  end if;

  insert into public.supplier_verification_reviewers(user_id, is_active, granted_by, note)
  values (p_reviewer_user_id, p_is_active, p_actor_user_id, nullif(btrim(p_note), ''))
  on conflict (user_id) do update
    set is_active = excluded.is_active,
        granted_by = case when excluded.is_active then p_actor_user_id else public.supplier_verification_reviewers.granted_by end,
        note = excluded.note;

  v_action := case when p_is_active then 'reviewer_activated' else 'reviewer_deactivated' end;
  insert into public.supplier_verification_assignment_events(
    reviewer_user_id, actor_user_id, action, note
  ) values (
    p_reviewer_user_id, p_actor_user_id, v_action, nullif(btrim(p_note), '')
  );

  if not p_is_active then
    with revoked as (
      update public.supplier_verification_review_assignments
      set is_active = false, revoked_at = now()
      where reviewer_user_id = p_reviewer_user_id and is_active = true
      returning id, application_id, reviewer_user_id
    )
    insert into public.supplier_verification_assignment_events(
      application_id, assignment_id, reviewer_user_id, actor_user_id, action, note
    )
    select application_id, id, reviewer_user_id, p_actor_user_id,
      'case_assignment_revoked',
      coalesce(nullif(btrim(p_note), ''), 'Reviewer deaktivatsiya qilindi; biriktirish bekor qilindi.')
    from revoked;
  end if;
  return p_reviewer_user_id;
end;
$$;

create or replace function public.admin_assign_supplier_verification_case(
  p_actor_user_id uuid,
  p_application_id uuid,
  p_reviewer_user_id uuid,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_assignment_id uuid;
  v_application_status text;
begin
  if not exists (
    select 1 from public.supplier_verification_admins a
    where a.user_id = p_actor_user_id and a.is_active = true
  ) then
    raise exception 'Administrator permission required' using errcode = '42501';
  end if;
  if p_note is not null and length(p_note) > 240 then
    raise exception 'Note is too long' using errcode = '22023';
  end if;
  select a.status into v_application_status
  from public.supplier_verification_applications a
  where a.id = p_application_id
  for update;
  if not found then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;
  if v_application_status not in ('submitted','under_review','needs_more_info') then
    raise exception 'Only open verification cases can be assigned' using errcode = '22023';
  end if;

  perform 1
  from public.supplier_verification_reviewers r
  where r.user_id = p_reviewer_user_id and r.is_active = true
  for update;
  if not found then
    raise exception 'Active reviewer required' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.supplier_verification_review_assignments a
    where a.application_id = p_application_id
      and a.reviewer_user_id = p_reviewer_user_id
      and a.is_active = true
  ) then
    raise exception 'Reviewer is already assigned to this application' using errcode = '23505';
  end if;

  insert into public.supplier_verification_review_assignments(
    application_id, reviewer_user_id, assigned_by, assignment_note
  ) values (
    p_application_id, p_reviewer_user_id, p_actor_user_id, nullif(btrim(p_note), '')
  ) returning id into v_assignment_id;

  insert into public.supplier_verification_assignment_events(
    application_id, assignment_id, reviewer_user_id, actor_user_id, action, note
  ) values (
    p_application_id, v_assignment_id, p_reviewer_user_id, p_actor_user_id,
    'case_assigned', nullif(btrim(p_note), '')
  );
  return v_assignment_id;
end;
$$;

create or replace function public.admin_revoke_supplier_verification_case(
  p_actor_user_id uuid,
  p_assignment_id uuid,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_assignment public.supplier_verification_review_assignments%rowtype;
begin
  if not exists (
    select 1 from public.supplier_verification_admins a
    where a.user_id = p_actor_user_id and a.is_active = true
  ) then
    raise exception 'Administrator permission required' using errcode = '42501';
  end if;
  if p_note is not null and length(p_note) > 240 then
    raise exception 'Note is too long' using errcode = '22023';
  end if;

  select * into v_assignment
  from public.supplier_verification_review_assignments
  where id = p_assignment_id
  for update;
  if not found then
    raise exception 'Assignment not found' using errcode = 'P0002';
  end if;
  if not v_assignment.is_active then
    raise exception 'Assignment is already inactive' using errcode = '22023';
  end if;

  update public.supplier_verification_review_assignments
  set is_active = false, revoked_at = now()
  where id = p_assignment_id;

  insert into public.supplier_verification_assignment_events(
    application_id, assignment_id, reviewer_user_id, actor_user_id, action, note
  ) values (
    v_assignment.application_id, v_assignment.id, v_assignment.reviewer_user_id,
    p_actor_user_id, 'case_assignment_revoked', nullif(btrim(p_note), '')
  );
  return p_assignment_id;
end;
$$;

revoke all on function public.admin_set_supplier_verification_reviewer(uuid,uuid,boolean,text) from public, anon, authenticated;
revoke all on function public.admin_assign_supplier_verification_case(uuid,uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.admin_revoke_supplier_verification_case(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.admin_set_supplier_verification_reviewer(uuid,uuid,boolean,text) to service_role;
grant execute on function public.admin_assign_supplier_verification_case(uuid,uuid,uuid,text) to service_role;
grant execute on function public.admin_revoke_supplier_verification_case(uuid,uuid,text) to service_role;

comment on table public.supplier_verification_admins is
  'Trusted admin allowlist. Bootstrap and maintenance require database owner/service role; never client writable.';
comment on table public.supplier_verification_assignment_events is
  'Append-only administrator/reviewer assignment audit history. Client access is denied.';

commit;

-- Bootstrap: insert the first authorized administrator using a trusted database owner session.
-- Example shape only; do not commit real user IDs or credentials:
-- insert into public.supplier_verification_admins(user_id, note) values ('<AUTH_USER_UUID>', 'Initial platform administrator');
