-- IDEA LAB: enforce one-way, participant-authorized job application status transitions.
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

  if old.status <> 'submitted' then
    raise exception 'Only submitted applications can change status'
      using errcode='42501';
  end if;

  select j.created_by into v_owner
  from idea_app.job_posts j
  where j.id = old.job_post_id;

  if v_actor = old.applicant_id and new.status = 'withdrawn' then
    return new;
  end if;

  if v_actor = v_owner and new.status in ('accepted', 'declined') then
    return new;
  end if;

  raise exception 'Only the applicant may withdraw or the vacancy owner may review a submitted application'
    using errcode='42501';
end;
$function$;

revoke all on function idea_private.guard_job_application_status_transition() from public, anon, authenticated;

drop trigger if exists guard_job_application_status_transition on idea_app.job_applications;
create trigger guard_job_application_status_transition
before update of status on idea_app.job_applications
for each row execute function idea_private.guard_job_application_status_transition();

commit;
