-- Let signed-in applicants retain access to the non-sensitive details of closed vacancies.
-- The public directory continues to expose published vacancies only.
drop policy if exists job_posts_select_closed_for_authenticated on idea_app.job_posts;
create policy job_posts_select_closed_for_authenticated
on idea_app.job_posts for select to authenticated
using (status='closed');