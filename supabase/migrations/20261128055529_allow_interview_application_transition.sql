-- IDEA LAB: allow employer interview invitations while preserving owner/applicant boundaries.
begin;

create or replace function idea_private.guard_job_application_status_transition()
returns trigger
language plpgsql
security definer
set search_path=''
as $function$
declare
  v_actor uuid := auth.uid();
  v_owner uuid;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  select j.created_by into v_owner
  from idea_app.job_posts j
  where j.id = old.job_post_id;

  if v_actor = old.applicant_id
     and old.status = 'submitted'
     and new.status = 'withdrawn' then
    return new;
  end if;

  if v_actor = v_owner
     and old.status = 'submitted'
     and new.status = 'interview' then
    return new;
  end if;

  if v_actor = v_owner
     and old.status in ('submitted', 'interview')
     and new.status in ('accepted', 'declined') then
    return new;
  end if;

  raise exception 'Only the applicant may withdraw or the vacancy owner may advance a submitted application'
    using errcode='42501';
end;
$function$;

revoke all on function idea_private.guard_job_application_status_transition() from public, anon, authenticated;

drop policy if exists job_applications_update_owner_review on idea_app.job_applications;
create policy job_applications_update_owner_review
on idea_app.job_applications
for update
to authenticated
using (
  status in ('submitted', 'interview')
  and exists (
    select 1
    from idea_app.job_posts j
    where j.id = job_applications.job_post_id
      and j.created_by = (select auth.uid())
  )
)
with check (
  status in ('interview', 'accepted', 'declined')
  and reviewed_at is not null
  and exists (
    select 1
    from idea_app.job_posts j
    where j.id = job_applications.job_post_id
      and j.created_by = (select auth.uid())
  )
);

commit;
