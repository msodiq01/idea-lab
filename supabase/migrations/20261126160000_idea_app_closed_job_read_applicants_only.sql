-- Restrict closed vacancy visibility to applicants.
-- Owners retain access through job_posts_select_published_or_owner;
-- moderators retain access through job_posts_moderator_read.
drop policy if exists job_posts_select_closed_for_authenticated on idea_app.job_posts;
create policy job_posts_select_closed_for_authenticated
on idea_app.job_posts
for select
to authenticated
using (
  status = 'closed'
  and exists (
    select 1
    from idea_app.job_applications a
    where a.job_post_id = job_posts.id
      and a.applicant_id = (select auth.uid())
  )
);
