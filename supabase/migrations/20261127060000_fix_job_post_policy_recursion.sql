-- Break the job_posts <-> job_applications RLS policy cycle.
-- The helper is narrowly scoped: it can only test whether the current user
-- has an application for the supplied vacancy. It is not an exposed RPC.
begin;

create or replace function idea_private.has_job_application(p_job_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from idea_app.job_applications a
      where a.job_post_id = p_job_post_id
        and a.applicant_id = (select auth.uid())
    );
$function$;

revoke all on function idea_private.has_job_application(uuid) from public, anon, authenticated;
grant execute on function idea_private.has_job_application(uuid) to authenticated;

drop policy if exists job_posts_select_closed_for_authenticated on idea_app.job_posts;
create policy job_posts_select_closed_for_authenticated
on idea_app.job_posts
for select
to authenticated
using (
  status = 'closed'
  and idea_private.has_job_application(id)
);

commit;
