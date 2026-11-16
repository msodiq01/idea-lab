-- IDEA LAB: private user asset storage
-- Version: 20261116180000
-- Depends on: Supabase Storage being enabled for the project.
-- Status: applied to Supabase production project idea-lab on 2026-11-16.nly; NOT applied to any Supabase project.
-- Access model: private bucket; each authenticated user can manage only objects
-- under their own UUID prefix. Public delivery and cross-user sharing are deferred.

begin;

-- A single private bucket for phase-one profile/org images and project documents.
-- Re-apply the secure settings if the bucket already exists; never make it public.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'idea-user-assets',
  'idea-user-assets',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
on conflict (id) do update
set name = excluded.name,
    public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Canonical object path:
-- <auth.uid()>/<avatars|organization-logos|project-files>/<uuid>.<allowed extension>
-- The bucket is private; there are deliberately no anon policies.
create policy idea_user_assets_select_own
on storage.objects
for select
to authenticated
using (
  bucket_id = 'idea-user-assets'
  and cardinality(storage.foldername(name)) = 2
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and (storage.foldername(name))[2] in ('avatars', 'organization-logos', 'project-files')
  and storage.filename(name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|pdf)$'
);

create policy idea_user_assets_insert_own
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'idea-user-assets'
  and cardinality(storage.foldername(name)) = 2
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and (storage.foldername(name))[2] in ('avatars', 'organization-logos', 'project-files')
  and storage.filename(name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|pdf)$'
);

-- UPDATE is required for Storage upsert/replacement. Both old and new object
-- paths must remain within the same authenticated user's namespace.
create policy idea_user_assets_update_own
on storage.objects
for update
to authenticated
using (
  bucket_id = 'idea-user-assets'
  and cardinality(storage.foldername(name)) = 2
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and (storage.foldername(name))[2] in ('avatars', 'organization-logos', 'project-files')
  and storage.filename(name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|pdf)$'
)
with check (
  bucket_id = 'idea-user-assets'
  and cardinality(storage.foldername(name)) = 2
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and (storage.foldername(name))[2] in ('avatars', 'organization-logos', 'project-files')
  and storage.filename(name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|pdf)$'
);

create policy idea_user_assets_delete_own
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'idea-user-assets'
  and cardinality(storage.foldername(name)) = 2
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and (storage.foldername(name))[2] in ('avatars', 'organization-logos', 'project-files')
  and storage.filename(name) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|pdf)$'
);

comment on policy idea_user_assets_select_own on storage.objects is
  'Private IDEA LAB asset access: authenticated owner can list/download only UUID-named objects in their own prefix.';
comment on policy idea_user_assets_insert_own on storage.objects is
  'Private IDEA LAB asset access: authenticated users can upload only UUID-named files in their own allowed folders.';
comment on policy idea_user_assets_update_own on storage.objects is
  'Private IDEA LAB asset access: update/upsert requires ownership of both existing and replacement object paths.';
comment on policy idea_user_assets_delete_own on storage.objects is
  'Private IDEA LAB asset access: authenticated users can delete only objects in their own allowed folders.';

commit;
