-- Private PDF evidence for project owners.
-- Uploads are scoped to the authenticated owner and their own project.
-- No public bucket, anonymous access, or service-role key is used.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'idea-project-legal-documents',
  'idea-project-legal-documents',
  false,
  10485760,
  array['application/pdf']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "project_legal_documents_owner_read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'idea-project-legal-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and case
    when coalesce((storage.foldername(name))[2], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then (select idea_private.is_project_owner(((storage.foldername(name))[2])::uuid))
    else false
  end
);

create policy "project_legal_documents_owner_upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'idea-project-legal-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and case
    when coalesce((storage.foldername(name))[2], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then (select idea_private.is_project_owner(((storage.foldername(name))[2])::uuid))
    else false
  end
);

create policy "project_legal_documents_owner_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'idea-project-legal-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and case
    when coalesce((storage.foldername(name))[2], '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then (select idea_private.is_project_owner(((storage.foldername(name))[2])::uuid))
    else false
  end
);
