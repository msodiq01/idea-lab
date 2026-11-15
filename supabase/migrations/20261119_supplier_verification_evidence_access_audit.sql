-- Audit issuance of temporary evidence download links.
-- The event records link issuance, not proof that the recipient downloaded the file.

begin;

create unique index if not exists supplier_verification_evidence_storage_path_uidx
  on public.supplier_verification_evidence(private_storage_path);

create table if not exists public.supplier_verification_evidence_access_events (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references public.supplier_verification_evidence(id) on delete cascade,
  application_id uuid not null references public.supplier_verification_applications(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in ('download_link_issued')),
  created_at timestamptz not null default now()
);

create index if not exists supplier_verification_evidence_access_events_application_idx
  on public.supplier_verification_evidence_access_events(application_id, created_at desc);

alter table public.supplier_verification_evidence_access_events enable row level security;
revoke all on public.supplier_verification_evidence_access_events from public, anon, authenticated;
grant all on public.supplier_verification_evidence_access_events to service_role;

comment on table public.supplier_verification_evidence_access_events is
  'Trusted Edge Function audit of temporary evidence download-link issuance; does not prove the file was downloaded.';

commit;
