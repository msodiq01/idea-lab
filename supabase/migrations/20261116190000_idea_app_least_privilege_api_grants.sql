-- IDEA LAB: least-privilege API grants for the existing RLS-protected schema.
-- Keep idea_app out of the PostgREST exposed-schema list. Public access remains
-- through the existing security_invoker directory views in public.

grant usage on schema idea_app to anon, authenticated;

-- Authenticated reads are restricted row-by-row by the existing RLS policies.
grant select on all tables in schema idea_app to authenticated;

-- Anonymous users receive only the columns required by the curated public
-- directory views. RLS remains enabled and filters rows on every base table.
grant select (id, name, slug, organization_type, description, location_label, website_url, created_at, visibility, status)
  on idea_app.organizations to anon;
grant select (slug, opportunity_type, title, summary, details, location_label, published_at, status)
  on idea_app.partnership_opportunities to anon;
grant select (display_name, username, headline, bio, city, country_code, created_at, visibility)
  on idea_app.profiles to anon;
grant select (slug, title, summary, category, project_id, listing_status, published_at)
  on idea_app.project_listings to anon;
grant select (id, project_type, status, visibility, start_date, target_date)
  on idea_app.projects to anon;
grant select (project_id, title, body, update_type, published_at, visibility, publication_status)
  on idea_app.project_updates to anon;
grant select (slug, title, category, description, quantity_label, availability_label, location_label, public_terms, published_at, status)
  on idea_app.resource_offers to anon;
grant select (id, public_name, headline, bio, skill_tags, specialist_categories, city, country_code, portfolio_urls, availability_status, engagement_modes, created_at, visibility)
  on idea_app.specialist_profiles to anon;

-- The public schema views remain the only anonymous API surface for these
-- directories. Their security_invoker setting preserves underlying RLS checks.
grant select on
  idea_app.public_organization_directory,
  idea_app.public_partnership_directory,
  idea_app.public_profile_directory,
  idea_app.public_project_directory,
  idea_app.public_project_updates,
  idea_app.public_resource_catalogue,
  idea_app.public_specialist_directory
to anon, authenticated;

grant select on
  public.idea_lab_public_organization_directory,
  public.idea_lab_public_partnership_directory,
  public.idea_lab_public_profile_directory,
  public.idea_lab_public_project_directory,
  public.idea_lab_public_project_updates,
  public.idea_lab_public_resource_catalogue,
  public.idea_lab_public_specialist_directory
to anon, authenticated;

-- Core project workflow writes. Column-level privileges intentionally prevent
-- clients from directly changing ownership, review metadata, and other fields
-- outside the validated RPC commands.
grant insert (created_by, title, summary, description, project_type, status, visibility, start_date, target_date)
  on idea_app.projects to authenticated;
grant update (title, summary, description, project_type, status, visibility, start_date, target_date, updated_at)
  on idea_app.projects to authenticated;

grant insert (project_id, slug, title, summary, category, listing_status, published_at)
  on idea_app.project_listings to authenticated;
grant update (slug, title, summary, category, listing_status, published_at, updated_at)
  on idea_app.project_listings to authenticated;

grant insert (project_id, user_id, membership_role, membership_status)
  on idea_app.project_members to authenticated;
grant update (membership_status, membership_role, updated_at)
  on idea_app.project_members to authenticated;

grant insert (project_id, applicant_id, applicant_note, status, reviewer_note, offer_amount, currency_code)
  on idea_app.applications to authenticated;
grant update (status, reviewer_note, updated_at)
  on idea_app.applications to authenticated;

-- Do not grant table-wide INSERT/UPDATE/DELETE, expose idea_app via PostgREST,
-- weaken RLS, or add service-role credentials to the client.
