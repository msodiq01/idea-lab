-- Tighten public vacancy column access and limit client write columns.
revoke select on idea_app.job_posts from anon,authenticated;
grant select(id,organization_id,title,description,salary_label,location_label,employment_type,published_at,status)
 on idea_app.job_posts to anon;
grant select(id,organization_id,created_by,title,description,salary_label,location_label,employment_type,status,published_at,created_at,updated_at)
 on idea_app.job_posts to authenticated;

revoke insert on idea_app.job_posts from authenticated;
grant insert(organization_id,created_by,title,description,salary_label,location_label,employment_type)
 on idea_app.job_posts to authenticated;

revoke insert on idea_app.job_applications from authenticated;
grant insert(job_post_id,applicant_id,message) on idea_app.job_applications to authenticated;

drop policy if exists job_posts_insert_owner_org on idea_app.job_posts;
create policy job_posts_insert_owner_org on idea_app.job_posts
for insert to authenticated
with check (
 created_by=(select auth.uid()) and status='published' and published_at is not null
 and exists(select 1 from idea_app.organizations o where o.id=organization_id
  and o.owner_id=(select auth.uid()) and o.visibility='public' and o.status='active' and o.organization_type<>'team')
);

drop policy if exists job_applications_insert_self on idea_app.job_applications;
create policy job_applications_insert_self on idea_app.job_applications
for insert to authenticated
with check (
 applicant_id=(select auth.uid()) and status='submitted' and reviewed_at is null
 and exists(select 1 from idea_app.job_posts j where j.id=job_post_id and j.status='published' and j.created_by<>(select auth.uid()))
);

drop policy if exists job_applications_update_owner_review on idea_app.job_applications;
create policy job_applications_update_owner_review on idea_app.job_applications
for update to authenticated
using(exists(select 1 from idea_app.job_posts j where j.id=job_post_id and j.created_by=(select auth.uid())))
with check(status in ('accepted','declined') and reviewed_at is not null
 and exists(select 1 from idea_app.job_posts j where j.id=job_post_id and j.created_by=(select auth.uid())));

drop policy if exists job_applications_update_applicant_withdraw on idea_app.job_applications;
create policy job_applications_update_applicant_withdraw on idea_app.job_applications
for update to authenticated
using(applicant_id=(select auth.uid()) and status='submitted')
with check(applicant_id=(select auth.uid()) and status='withdrawn' and reviewed_at is null);