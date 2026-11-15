-- IDEA LAB private Storage foundation for supplier verification evidence.
-- Creates a private bucket and narrowly scoped object policies.
-- No upload UI, signed-URL endpoint, malware scanning, or document processing is enabled.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'supplier-verification-private',
  'supplier-verification-private',
  false,
  10485760,
  array['application/pdf','image/jpeg','image/png']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Supplier uploads own verification evidence"
  on storage.objects;
create policy "Supplier uploads own verification evidence"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'supplier-verification-private'
  and array_length(storage.foldername(name), 1) = 2
  and (storage.foldername(name))[2] in (
    'business_registration',
    'representative_authority',
    'business_address',
    'other'
  )
  and storage.filename(name) ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$'
  and exists (
    select 1
    from public.supplier_verification_applications a
    where a.id::text = (storage.foldername(name))[1]
      and a.supplier_user_id = auth.uid()
      and a.status in ('submitted','needs_more_info')
  )
);

drop policy if exists "Supplier reads own verification evidence"
  on storage.objects;
create policy "Supplier reads own verification evidence"
on storage.objects for select to authenticated
using (
  bucket_id = 'supplier-verification-private'
  and exists (
    select 1
    from public.supplier_verification_applications a
    where a.id::text = (storage.foldername(name))[1]
      and a.supplier_user_id = auth.uid()
  )
);

drop policy if exists "Active reviewers read verification evidence"
  on storage.objects;
create policy "Active reviewers read verification evidence"
on storage.objects for select to authenticated
using (
  bucket_id = 'supplier-verification-private'
  and public.is_supplier_verification_reviewer()
);

-- Intentionally no client UPDATE or DELETE policies. Replacing or deleting a
-- document must be a separately authorized, audited server-side operation.

commit;

-- Staging-only checks:
-- 1. Bucket is private and accepts only PDF/JPEG/PNG up to 10 MiB.
-- 2. Supplier A can upload only into A's own active application folder.
-- 3. Supplier B cannot upload to or read A's folder.
-- 4. Uploads for approved/rejected applications are denied.
-- 5. Active reviewer can read evidence; revoked reviewer cannot.
-- 6. Authenticated clients cannot overwrite or delete objects.
-- 7. Anonymous users cannot read objects and public URLs do not work.
-- 8. Verify file contents, not only MIME headers, before accepting evidence.
