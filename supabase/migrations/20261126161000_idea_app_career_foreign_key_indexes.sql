-- Cover frequently joined career tables and foreign-key maintenance paths.
create index if not exists job_posts_organization_idx
  on idea_app.job_posts (organization_id);

create index if not exists job_application_activity_application_idx
  on idea_app.job_application_activity (application_id);

create index if not exists job_application_activity_actor_idx
  on idea_app.job_application_activity (actor_id);
