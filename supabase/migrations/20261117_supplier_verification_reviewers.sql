-- IDEA LAB supplier verification reviewer authorization and decision RPC
-- Additive migration. Apply only to a disposable Supabase staging project after review.

begin;

create table if not exists public.supplier_verification_reviewers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id) on delete set null,
  note text,
  constraint supplier_verification_reviewer_note_check check (note is null or length(note) <= 240)
);

alter table public.supplier_verification_reviewers enable row level security;
revoke all on public.supplier_verification_reviewers from public, anon, authenticated;
grant all on public.supplier_verification_reviewers to service_role;

create or replace function public.is_supplier_verification_reviewer()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.supplier_verification_reviewers r
    where r.user_id = auth.uid()
      and r.is_active = true
  );
$$;

revoke all on function public.is_supplier_verification_reviewer() from public, anon;
grant execute on function public.is_supplier_verification_reviewer() to authenticated;

drop policy if exists "Active reviewers read verification applications"
  on public.supplier_verification_applications;
create policy "Active reviewers read verification applications"
on public.supplier_verification_applications for select to authenticated
using (public.is_supplier_verification_reviewer());

drop policy if exists "Active reviewers read verification events"
  on public.supplier_verification_events;
create policy "Active reviewers read verification events"
on public.supplier_verification_events for select to authenticated
using (public.is_supplier_verification_reviewer());

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

revoke all on function public.review_supplier_verification_application(uuid,text,text,text,text,timestamptz)
  from public, anon;
grant execute on function public.review_supplier_verification_application(uuid,text,text,text,text,timestamptz)
  to authenticated;

comment on table public.supplier_verification_reviewers is
  'Reviewer allowlist. Provisioned only by trusted server/service-role operations; never editable by clients.';
comment on function public.review_supplier_verification_application(uuid,text,text,text,text,timestamptz) is
  'Atomic reviewer transition with auth.uid authorization, row lock, state validation, and append-only event.';

commit;

-- Staging-only checks:
-- 1. Ordinary authenticated user cannot read reviewer allowlist or call reviewer RPC successfully.
-- 2. Reviewer with inactive/revoked assignment cannot read review queue or decide.
-- 3. Active reviewer can read applications and execute only allowed transitions.
-- 4. Concurrent decisions serialize on the application row; only one valid transition succeeds.
-- 5. Approval fails without evidence metadata and a verification type.
-- 6. Every successful reviewer transition creates one event with server-derived actor ID.
-- 7. Client cannot directly update application rows or insert/update/delete events.
-- Reviewer assignment must be provisioned by trusted backend/service role, never by client UI.
