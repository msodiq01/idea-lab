-- Add indexes for foreign-key columns flagged by Supabase Database Advisors.
-- These indexes are additive and do not change row visibility or authorization.
-- The existing partial indexes on project_tasks.assignee_id and projects.organization_id
-- already cover non-NULL foreign-key values and are intentionally not duplicated.

create index if not exists organization_members_invited_by_idx
  on idea_app.organization_members (invited_by);

create index if not exists partnership_enquiries_project_id_idx
  on idea_app.partnership_enquiries (project_id);

create index if not exists partnership_opportunities_owner_id_idx
  on idea_app.partnership_opportunities (owner_id);

create index if not exists partnership_opportunities_project_id_idx
  on idea_app.partnership_opportunities (project_id);

create index if not exists project_members_invited_by_idx
  on idea_app.project_members (invited_by);

create index if not exists project_tasks_created_by_idx
  on idea_app.project_tasks (created_by);

create index if not exists project_updates_author_id_idx
  on idea_app.project_updates (author_id);

create index if not exists resource_offers_owner_id_idx
  on idea_app.resource_offers (owner_id);

create index if not exists resource_offers_project_id_idx
  on idea_app.resource_offers (project_id);

create index if not exists resource_requests_project_id_idx
  on idea_app.resource_requests (project_id);

create index if not exists specialist_requests_requested_by_idx
  on idea_app.specialist_requests (requested_by);
