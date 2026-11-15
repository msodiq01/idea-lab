-- IDEA LAB case-level reviewer assignment and least-privilege access.
-- Additive migration. Apply only to a disposable staging project after review.
-- Assignments are provisioned only by trusted server/service-role operations.

begin;

create table if not exists public.supplier_verification_review_assignments (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.supplier_verification_applications(id) on delete cascade,
  reviewer_user_id uuid not null references public.supplier_verification_reviewers(user_id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  is_active boolean not null default true,
  assignment_note text,
  assigned_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint supplier_verification_assignment_note_check
    check (assignment_note is null or length(assignment_note) <= 240),
  constraint supplier_verification_assignment_revoked_check
    check ((is_active = true and revoked_at is null) or (is_active = false and revoked_at is not null))
);

create unique index if not exists supplier_verification_one_active_case_reviewer_idx
  on public.supplier_verification_review_assignments(application_id, reviewer_user_id)
  where is_active = true;
create index if not exists supplier_verification_assignments_reviewer_idx
  on public.supplier_verification_review_assignments(reviewer_user_id, assigned_at desc)
  where is_active = true;
create index if not exists supplier_verification_assignments_application_idx
  on public.supplier_verification_review_assignments(application_id)
  where is_active = true;

alter table public.supplier_verification_review_assignments enable row level security;
revoke all on public.supplier_verification_review_assignments from public, anon, authenticated;
grant all on public.supplier_verification_review_assignments to service_role;

create or replace function public.can_review_supplier_verification_application(p_application_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.supplier_verification_review_assignments a
    join public.supplier_verification_reviewers r
      on r.user_id = a.reviewer_user_id
    where a.application_id = p_application_id
      and a.reviewer_user_id = auth.uid()
      and a.is_active = true
      and r.is_active = true
  );
$$;
revoke all on function public.can_review_supplier_verification_application(uuid) from public, anon;
grant execute on function public.can_review_supplier_verification_application(uuid) to authenticated;

drop policy if exists "Active reviewers read verification applications"
  on public.supplier_verification_applications;
create policy "Assigned reviewers read verification applications"
on public.supplier_verification_applications for select to authenticated
using (public.can_review_supplier_verification_application(id));

drop policy if exists "Active reviewers read verification events"
  on public.supplier_verification_events;
create policy "Assigned reviewers read verification events"
on public.supplier_verification_events for select to authenticated
using (public.can_review_supplier_verification_application(application_id));

drop policy if exists "Active reviewers read verification evidence"
  on storage.objects;
create policy "Assigned reviewers read verification evidence"
on storage.objects for select to authenticated
using (
  bucket_id = 'supplier-verification-private'
  and exists (
    select 1
    from public.supplier_verification_applications a
    where a.id::text = (storage.foldername(name))[1]
      and public.can_review_supplier_verification_application(a.id)
  )
);

create or replace function public.review_supplier_verification_application(
  p_application_id uuid,
  p_next_status text,
  p_reason_code text,
  p_review_note text default null,
  p_verification_type text default null,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_reviewer_id uuid := auth.uid();
  v_application public.supplier_verification_applications%rowtype;
  v_allowed boolean := false;
begin
  if v_reviewer_id is null then
    raise exception 'Authenticated reviewer required' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.supplier_verification_reviewers r
    where r.user_id = v_reviewer_id and r.is_active = true
  ) then
    raise exception 'Reviewer permission required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.supplier_verification_review_assignments a
    where a.application_id = p_application_id
      and a.reviewer_user_id = v_reviewer_id
      and a.is_active = true
  ) then
    raise exception 'Active case assignment required' using errcode = '42501';
  end if;

  if p_next_status is null or p_next_status not in ('under_review','needs_more_info','approved','rejected') then
    raise exception 'Unsupported review status' using errcode = '22023';
  end if;
  if p_reason_code is null or length(btrim(p_reason_code)) not between 1 and 80 then
    raise exception 'A valid reason code is required' using errcode = '22023';
  end if;
  if p_review_note is not null and length(p_review_note) > 1000 then
    raise exception 'Review note is too long' using errcode = '22023';
  end if;

  select * into v_application
  from public.supplier_verification_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;

  v_allowed :=
    (v_application.status = 'submitted' and p_next_status in ('under_review','needs_more_info','rejected'))
    or (v_application.status = 'under_review' and p_next_status in ('needs_more_info','approved','rejected'))
    or (v_application.status = 'needs_more_info' and p_next_status in ('under_review','approved','rejected'));

  if not v_allowed then
    raise exception 'Invalid verification status transition' using errcode = '22023';
  end if;

  if p_next_status in ('needs_more_info','rejected')
     and (p_review_note is null or length(btrim(p_review_note)) = 0) then
    raise exception 'A review note is required for this decision' using errcode = '22023';
  end if;

  if p_next_status = 'approved' then
    if p_verification_type is null or length(btrim(p_verification_type)) not between 1 and 80 then
      raise exception 'Verification type is required for approval' using errcode = '22023';
    end if;
    if not exists (
      select 1 from public.supplier_verification_evidence e
      where e.application_id = p_application_id
    ) then
      raise exception 'Evidence must be recorded before approval' using errcode = '22023';
    end if;
    if p_expires_at is not null and p_expires_at <= now() then
      raise exception 'Verification expiry must be in the future' using errcode = '22023';
    end if;
  elsif p_verification_type is not null or p_expires_at is not null then
    raise exception 'Verification type and expiry are only valid for approval' using errcode = '22023';
  end if;

  update public.supplier_verification_applications
  set status = p_next_status,
      reviewer_user_id = v_reviewer_id,
      reviewed_at = case when p_next_status in ('approved','rejected') then now() else null end,
      review_note = nullif(btrim(p_review_note), ''),
      verification_type = case when p_next_status = 'approved' then btrim(p_verification_type) else null end,
      expires_at = case when p_next_status = 'approved' then p_expires_at else null end
  where id = p_application_id;

  insert into public.supplier_verification_events (
    application_id, actor_user_id, from_status, to_status, reason_code
  ) values (
    p_application_id, v_reviewer_id, v_application.status, p_next_status, btrim(p_reason_code)
  );

  return p_application_id;
end;
$$;


comment on table public.supplier_verification_review_assignments is
  'Per-application reviewer assignments. Only trusted service-role operations may create, revoke, or inspect assignments.';
comment on function public.can_review_supplier_verification_application(uuid) is
  'True only when auth.uid() is an active reviewer explicitly assigned to this application.';
comment on function public.review_supplier_verification_application(uuid,text,text,text,text,timestamptz) is
  'Atomic reviewer decision requiring an active reviewer allowlist entry and an active case-level assignment.';

commit;

-- Staging-only checks:
-- 1. Active reviewer without an assignment cannot read an application, events, or evidence.
-- 2. Assigned active reviewer can read only assigned application, its events, and evidence.
-- 3. Revoking an assignment immediately blocks subsequent reads and decisions.
-- 4. Deactivating reviewer blocks access even if assignment remains active.
-- 5. Unassigned reviewer cannot call decision RPC; assigned reviewer can perform allowed transitions.
-- 6. Supplier continues to read own application and own evidence regardless of reviewer assignment.
-- 7. Authenticated clients cannot read or mutate assignment rows.
-- 8. Assignment grant/revoke is performed only by a trusted backend using service_role.
