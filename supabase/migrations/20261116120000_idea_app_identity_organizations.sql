-- IDEA LAB: isolated identity + organization foundation
-- Version: 20261116120000
-- Status: repository draft only; NOT applied to any Supabase project.
-- Scope: additive objects in private schema idea_app. Existing public schema is untouched.
-- Access: deny-by-default. No Data API exposure, client grants, or RLS policies in this phase.

begin;

create schema idea_app;

-- Keep the namespace unavailable to browser roles until explicit API/RLS review.
revoke all on schema idea_app from public, anon, authenticated;

create table idea_app.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  username text,
  headline text not null default '',
  bio text not null default '',
  avatar_storage_path text,
  city text,
  country_code text,
  visibility text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(display_name) <= 120),
  constraint profiles_username_format check (
    username is null or (
      username = lower(username)
      and username ~ '^[a-z0-9][a-z0-9_.-]{2,29}$'
    )
  ),
  constraint profiles_headline_length check (char_length(headline) <= 160),
  constraint profiles_bio_length check (char_length(bio) <= 1600),
  constraint profiles_country_code_format check (
    country_code is null or country_code ~ '^[A-Z]{2}$'
  ),
  constraint profiles_visibility_check check (visibility in ('private', 'unlisted', 'public'))
);

create unique index profiles_username_lower_uidx
  on idea_app.profiles (lower(username))
  where username is not null;

create table idea_app.profile_contacts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  phone_e164 text,
  telegram_handle text,
  contact_email text,
  website_url text,
  visibility text not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_contacts_phone_format check (
    phone_e164 is null or phone_e164 ~ '^\+[1-9][0-9]{7,14}$'
  ),
  constraint profile_contacts_telegram_length check (
    telegram_handle is null or char_length(telegram_handle) between 2 and 64
  ),
  constraint profile_contacts_email_length check (
    contact_email is null or char_length(contact_email) <= 254
  ),
  constraint profile_contacts_website_https check (
    website_url is null or website_url ~ '^https://'
  ),
  constraint profile_contacts_visibility_check check (
    visibility in ('private', 'organization', 'public')
  )
);

create table idea_app.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  name text not null,
  slug text,
  organization_type text not null default 'other',
  description text not null default '',
  location_label text,
  website_url text,
  logo_storage_path text,
  visibility text not null default 'private',
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_name_length check (
    char_length(trim(name)) between 2 and 120
  ),
  constraint organizations_slug_format check (
    slug is null or (
      slug = lower(slug)
      and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
      and char_length(slug) <= 80
    )
  ),
  constraint organizations_type_check check (
    organization_type in (
      'company', 'nonprofit', 'educational_institution',
      'community', 'team', 'other'
    )
  ),
  constraint organizations_description_length check (
    char_length(description) <= 2400
  ),
  constraint organizations_website_https check (
    website_url is null or website_url ~ '^https://'
  ),
  constraint organizations_visibility_check check (
    visibility in ('private', 'unlisted', 'public')
  ),
  constraint organizations_status_check check (
    status in ('draft', 'active', 'archived')
  )
);

create unique index organizations_slug_lower_uidx
  on idea_app.organizations (lower(slug))
  where slug is not null;

create index organizations_owner_created_idx
  on idea_app.organizations (owner_id, created_at desc);

create table idea_app.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references idea_app.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  membership_role text not null default 'member',
  membership_status text not null default 'pending',
  invited_by uuid references auth.users(id) on delete set null,
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organization_members_role_check check (
    membership_role in ('admin', 'editor', 'member')
  ),
  constraint organization_members_status_check check (
    membership_status in ('invited', 'pending', 'active', 'declined', 'removed')
  ),
  constraint organization_members_invited_at_check check (
    membership_status <> 'invited' or invited_at is not null
  ),
  constraint organization_members_joined_at_check check (
    membership_status <> 'active' or joined_at is not null
  ),
  constraint organization_members_org_user_unique unique (organization_id, user_id)
);

create index organization_members_user_status_idx
  on idea_app.organization_members (user_id, membership_status);

create index organization_members_org_status_idx
  on idea_app.organization_members (organization_id, membership_status);

-- Defense in depth. No policies means RLS denies all row access.
alter table idea_app.profiles enable row level security;
alter table idea_app.profile_contacts enable row level security;
alter table idea_app.organizations enable row level security;
alter table idea_app.organization_members enable row level security;

-- Explicitly ensure browser roles receive no table privileges in this phase.
revoke all on all tables in schema idea_app from public, anon, authenticated;

comment on schema idea_app is
  'Private IDEA LAB application schema; do not expose through Data API until security review.';
comment on table idea_app.profiles is
  'Non-authoritative application profile. Authorization roles must never be stored here.';
comment on table idea_app.profile_contacts is
  'Private contact details; not available to browser roles in the foundation migration.';
comment on table idea_app.organizations is
  'Organization records. owner_id is the canonical owner; organization ownership is not a client-editable role.';
comment on table idea_app.organization_members is
  'Organization membership excluding the canonical owner; roles are admin, editor, or member.';

commit;
