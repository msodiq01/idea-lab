-- Least-privilege write grants for profile, specialist, organization,
-- resource-offer/request and partnership workflows.
-- RLS remains enabled; these grants do not bypass existing row policies.
-- Sensitive storage paths and review-only columns are intentionally excluded
-- from updates until dedicated role-safe review commands exist.

grant insert (user_id, display_name, username, headline, bio, city, country_code, visibility)
  on idea_app.profiles to authenticated;
grant update (display_name, username, headline, bio, city, country_code, visibility, updated_at)
  on idea_app.profiles to authenticated;

grant insert (
  user_id, public_name, headline, bio, skill_tags, specialist_categories,
  city, country_code, portfolio_urls, availability_status, engagement_modes, visibility
) on idea_app.specialist_profiles to authenticated;
grant update (
  public_name, headline, bio, skill_tags, specialist_categories,
  city, country_code, portfolio_urls, availability_status, engagement_modes,
  visibility, updated_at
) on idea_app.specialist_profiles to authenticated;

grant insert (
  owner_id, name, slug, organization_type, description,
  location_label, website_url, visibility, status
) on idea_app.organizations to authenticated;
grant update (
  name, slug, organization_type, description, location_label,
  website_url, visibility, status, updated_at
) on idea_app.organizations to authenticated;

grant insert (
  organization_id, user_id, membership_role, membership_status, invited_by, invited_at
) on idea_app.organization_members to authenticated;
grant update (membership_status, joined_at, updated_at)
  on idea_app.organization_members to authenticated;

grant insert (
  owner_id, project_id, slug, title, category, description, quantity_label,
  availability_label, location_label, public_terms, status
) on idea_app.resource_offers to authenticated;
grant update (
  project_id, slug, title, category, description, quantity_label,
  availability_label, location_label, public_terms, status, published_at, updated_at
) on idea_app.resource_offers to authenticated;

grant insert (
  owner_id, project_id, slug, opportunity_type, title, summary,
  details, location_label, status
) on idea_app.partnership_opportunities to authenticated;
grant update (
  project_id, slug, opportunity_type, title, summary, details,
  location_label, status, published_at, updated_at
) on idea_app.partnership_opportunities to authenticated;

grant insert (
  offer_id, requester_id, project_id, request_note, requested_quantity,
  status, owner_note, reviewed_at
) on idea_app.resource_requests to authenticated;
grant insert (
  opportunity_id, requester_id, project_id, message,
  status, owner_note, reviewed_at
) on idea_app.partnership_enquiries to authenticated;