-- IDEA LAB supplier verification backend foundation
-- Additive migration only. Review and apply in a disposable Supabase staging project first.
-- Does not create a Storage bucket, accept document uploads, or enable reviewer decisions.

begin;

create table if not exists public.supplier_verification_applications (
  id uuid primary key default gen_random_uuid(),
  supplier_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'submitted'
    check (status in ('submitted','under_review','needs_more_info','approved','rejected')),
  consent_version text not null,
  consent_at timestamptz not null default now(),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_user_id uuid references auth.users(id) on delete set null,
  review_note text,
  verification_type text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supplier_verification_review_state_check check (
    (status in ('submitted','under_review','needs_more_info') and reviewed_at is null)
    or
    (status in ('approved','rejected') and reviewed_at is not null and reviewer_user_id is not null)
  ),
  constraint supplier_verification_consent_version_check check (length(btrim(consent_version)) between 1 and 40)
);

create table if not exists public.supplier_verification_evidence (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.supplier_verification_applications(id) on delete cascade,
  document_type text not null
    check (document_type in ('business_registration','representative_authority','business_address','other')),
  private_storage_path text not null,
  masked_reference text,
  uploaded_at timestamptz not null default now(),
  retention_until timestamptz,
  created_at timestamptz not null default now(),
  constraint supplier_verification_evidence_path_check check (length(btrim(private_storage_path)) between 1 and 500),
  constraint supplier_verification_evidence_mask_check check (masked_reference is null or length(masked_reference) <= 80)
);

create table if not exists public.supplier_verification_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.supplier_verification_applications(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  from_status text,
  to_status text not null check (to_status in ('submitted','under_review','needs_more_info','approved','rejected')),
  reason_code text not null,
  created_at timestamptz not null default now(),
  constraint supplier_verification_event_from_status_check check (from_status is null or from_status in ('submitted','under_review','needs_more_info','approved','rejected')),
  constraint supplier_verification_event_reason_check check (length(btrim(reason_code)) between 1 and 80)
);

create index if not exists supplier_verification_applications_owner_idx
  on public.supplier_verification_applications(supplier_user_id, created_at desc);
create index if not exists supplier_verification_events_application_idx
  on public.supplier_verification_events(application_id, created_at);
create index if not exists supplier_verification_evidence_application_idx
  on public.supplier_verification_evidence(application_id);
create unique index if not exists supplier_verification_one_open_application_idx
  on public.supplier_verification_applications(supplier_user_id)
  where status in ('submitted','under_review','needs_more_info');

create or replace function public.guard_supplier_verification_submission()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'A signed-in supplier is required'; end if;
  new.supplier_user_id := auth.uid();
  new.status := 'submitted';
  new.consent_at := now();
  new.submitted_at := now();
  new.reviewed_at := null;
  new.reviewer_user_id := null;
  new.review_note := null;
  new.verification_type := null;
  new.expires_at := null;
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.guard_supplier_verification_submission() from public, anon, authenticated;
drop trigger if exists guard_supplier_verification_submission on public.supplier_verification_applications;
create trigger guard_supplier_verification_submission
before insert on public.supplier_verification_applications
for each row execute procedure public.guard_supplier_verification_submission();

create or replace function public.record_supplier_verification_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.supplier_verification_events (application_id, actor_user_id, from_status, to_status, reason_code)
  values (new.id, new.supplier_user_id, null, 'submitted', 'application_submitted');
  return new;
end;
$$;
revoke all on function public.record_supplier_verification_submission() from public, anon, authenticated;
drop trigger if exists record_supplier_verification_submission on public.supplier_verification_applications;
create trigger record_supplier_verification_submission
after insert on public.supplier_verification_applications
for each row execute procedure public.record_supplier_verification_submission();

alter table public.supplier_verification_applications enable row level security;
alter table public.supplier_verification_evidence enable row level security;
alter table public.supplier_verification_events enable row level security;

drop policy if exists "Suppliers read their own verification applications" on public.supplier_verification_applications;
create policy "Suppliers read their own verification applications"
on public.supplier_verification_applications for select to authenticated
using (supplier_user_id = auth.uid());

drop policy if exists "Suppliers submit their own verification applications" on public.supplier_verification_applications;
create policy "Suppliers submit their own verification applications"
on public.supplier_verification_applications for insert to authenticated
with check (supplier_user_id = auth.uid() and status = 'submitted'
  and reviewed_at is null and reviewer_user_id is null and review_note is null);

drop policy if exists "Suppliers read their own verification events" on public.supplier_verification_events;
create policy "Suppliers read their own verification events"
on public.supplier_verification_events for select to authenticated
using (exists (
  select 1 from public.supplier_verification_applications a
  where a.id = application_id and a.supplier_user_id = auth.uid()
));

revoke all on public.supplier_verification_applications from public, anon, authenticated;
revoke all on public.supplier_verification_evidence from public, anon, authenticated;
revoke all on public.supplier_verification_events from public, anon, authenticated;
grant select, insert on public.supplier_verification_applications to authenticated;
grant select on public.supplier_verification_events to authenticated;
grant all on public.supplier_verification_applications to service_role;
grant all on public.supplier_verification_evidence to service_role;
grant all on public.supplier_verification_events to service_role;

comment on table public.supplier_verification_applications is 'Supplier verification requests. Client may submit and read own request; reviewer decisions require a trusted backend.';
comment on table public.supplier_verification_evidence is 'Private evidence metadata only. No client grants or Storage bucket are created by this migration.';
comment on table public.supplier_verification_events is 'Audit trail. Clients may read own events but cannot insert, update, or delete events.';
comment on column public.supplier_verification_evidence.private_storage_path is 'Opaque path in a future private Storage bucket; never a public URL and not proof of verification.';

commit;

-- Staging-only checks:
-- 1. A can submit/read own application; B cannot read it.
-- 2. Client cannot set supplier identity, status, reviewer, review note or review time.
-- 3. Client cannot update/delete applications or write audit events.
-- 4. Client cannot read evidence metadata or access evidence objects.
-- 5. A second open application for the same supplier is rejected.
-- 6. Submission creates exactly one initial audit event.
-- Reviewer transitions and document uploads are intentionally not implemented.
