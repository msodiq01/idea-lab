-- Least-privilege write grants for profile, specialist, organization,
-- resource-offer/request and partnership workflows.
-- RLS remains enabled; these grants do not bypass existing row policies.
-- Sensitive storage paths and moderation fields are intentionally excluded.

begin;

-- Personal profiles: users may write only their own public-facing profile fields.
grant insert (user_id, display_name, username, headline, bio, city, country_code, visibility)
  on idea_app.profiles to authenticated;
grant update (display_name, username, headline, bio, city, country_code, visibility, updated_at)
  on idea_app.profiles to authenticated;

-- Specialist profiles: owner-only rows remain enforced by existing RLS policies.
grant insert (
  user_id, public_name, headline, bio, skill_tags, specialist_categories,
  city, country_code, portfolio_urls, availability_status, engagement_modes, visibility
) on idea_app.specialist_profiles to authenticated;
grant update (
  public_name, headline, bio, skill_tags, specialist_categories,
  city, country_code, portfolio_urls, availability_status, engagement_modes,
  visibility, updated_at
) on idea_app.specialist_profiles to authenticated;

-- Organizations: do not expose or permit direct writes to logo storage paths.
grant insert (
  owner_id, name, slug, organization_type, description,
  location_label, website_url, visibility, status
) on idea_app.organizations to authenticated;
grant update (
  name, slug, organization_type, description, location_label,
  website_url, visibility, status, updated_at
) on idea_app.organizations to authenticated;

-- Membership: invitation rows must still satisfy the existing owner-invite policy.
-- Members can update only their acceptance state; RLS checks the target user.
grant insert (
  organization_id, user_id, membership_role, membership_status, invited_by, invited_at
) on idea_app.organization_members to authenticated;
grant update (membership_status, joined_at, updated_at)
  on idea_app.organization_members to authenticated;

-- Resource offers: owners can create and maintain their own offers under RLS.
grant insert (
  owner_id, project_id, slug, title, category, description, quantity_label,
  availability_label, location_label, public_terms, status
) on idea_app.resource_offers to authenticated;
grant update (
  project_id, slug, title, category, description, quantity_label,
  availability_label, location_label, public_terms, status, published_at, updated_at
) on idea_app.resource_offers to authenticated;

-- Partnership opportunities: owner-only create/edit under existing RLS.
grant insert (
  owner_id, project_id, slug, opportunity_type, title, summary,
  details, location_label, status
) on idea_app.partnership_opportunities to authenticated;
grant update (
  project_id, slug, opportunity_type, title, summary, details,
  location_label, status, published_at, updated_at
) on idea_app.partnership_opportunities to authenticated;

-- Requests/enquiries: allow authenticated submission only.
-- Review/status updates are withheld until role-safe review RPCs are implemented.
grant insert (
  offer_id, requester_id, project_id, request_note, requested_quantity,
  status, owner_note, reviewed_at
) on idea_app.resource_requests to authenticated;
grant insert (
  opportunity_id, requester_id, project_id, message,
  status, owner_note, reviewed_at
) on idea_app.partnership_enquiries to authenticated;

commit;
