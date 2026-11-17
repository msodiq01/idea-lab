/* IDEA LAB — Supabase data gateway
 * Uses safe public invoker views and SECURITY INVOKER RPC wrappers.
 * Private idea_app tables remain outside the exposed Data API schema.
 */
((global) => {
  "use strict";

  if (global.IDEALAB_DATA) return;

  const VIEWS = Object.freeze({
    projects: "idea_lab_public_project_directory",
    updates: "idea_lab_public_project_updates",
    specialists: "idea_lab_public_specialist_directory",
    resources: "idea_lab_public_resource_catalogue",
    partnerships: "idea_lab_public_partnership_directory",
    teams: "idea_lab_public_organization_directory"
  });
  const DEFAULT_LIMIT = 20;
  const MAX_LIMIT = 50;

  function fail(code, message) {
    return { ok: false, data: null, error: { code, message } };
  }

  function getClient() {
    const auth = global.IDEALAB_AUTH;
    if (!auth || typeof auth.getClient !== "function") return null;
    return auth.getClient();
  }

  function limitValue(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
    return Math.max(1, Math.min(MAX_LIMIT, Math.floor(parsed)));
  }

  async function runCommand(name, args) {
    const client = getClient();
    if (!client) return fail("BACKEND_NOT_CONFIGURED", "Backend hali ulanmagan yoki Auth sessiyasi tayyor emas.");
    if (typeof client.schema !== "function") return fail("DATA_API_UNAVAILABLE", "Supabase Data API mijozi mavjud emas.");
    try {
      const response = await client.rpc("idea_lab_" + name, args);
      if (response && response.error) {
        return fail("COMMAND_FAILED", "Amal bajarilmadi. Ruxsatlar va backend migratsiyalarini tekshirish kerak.");
      }
      return { ok: true, data: response ? response.data : null, error: null };
    } catch (_) {
      return fail("COMMAND_FAILED", "Backend amali bajarilmadi.");
    }
  }

  async function runPublicCommand(name, args) {
    const client = getClient();
    if (!client || typeof client.rpc !== "function") return fail("BACKEND_NOT_CONFIGURED", "Backend hali ulanmagan yoki Auth sessiyasi tayyor emas.");
    try {
      const response = await client.rpc(name, args);
      if (response && response.error) return fail("COMMAND_FAILED", "Amal bajarilmadi. Ruxsatlar va backend migratsiyalarini tekshirish kerak.");
      return { ok: true, data: response ? response.data : null, error: null };
    } catch (_) {
      return fail("COMMAND_FAILED", "Backend amali bajarilmadi.");
    }
  }

  async function queryPublicView(view, configure) {
    const client = getClient();
    if (!client || typeof client.from !== "function") return fail("BACKEND_NOT_CONFIGURED", "Backend hali ulanmagan yoki Auth sessiyasi tayyor emas.");
    try {
      let query = client.from(view).select("*");
      if (typeof configure === "function") query = configure(query);
      const response = await query;
      if (response && response.error) return fail("DATA_REQUEST_FAILED", "Ma'lumotlarni yuklab bo'lmadi. Backend ruxsatlarini tekshiring.");
      return { ok: true, data: Array.isArray(response && response.data) ? response.data : [], error: null };
    } catch (_) {
      return fail("DATA_REQUEST_FAILED", "Ma'lumotlar xizmati bilan bog'lanib bo'lmadi.");
    }
  }

  function requiredText(value, min, max) {
    return typeof value === "string" && value.trim().length >= min && value.length <= max;
  }

  function isUuid(value) {
    return typeof value === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }

  async function queryView(view, configure) {
    const client = getClient();
    if (!client) return fail("BACKEND_NOT_CONFIGURED", "Backend hali ulanmagan yoki Auth sessiyasi tayyor emas.");
    if (typeof client.schema !== "function") return fail("DATA_API_UNAVAILABLE", "Supabase Data API mijozi mavjud emas.");
    try {
      let query = client.from(view).select("*");
      if (typeof configure === "function") query = configure(query);
      const response = await query;
      if (response && response.error) {
        return fail("DATA_REQUEST_FAILED", "Ma'lumotlarni yuklab bo'lmadi. Backend ruxsatlari va Data API sozlamalarini tekshirish kerak.");
      }
      return { ok: true, data: Array.isArray(response && response.data) ? response.data : [], error: null };
    } catch (_) {
      return fail("DATA_REQUEST_FAILED", "Ma'lumotlar xizmati bilan bog'lanib bo'lmadi.");
    }
  }

  const api = Object.freeze({
    getStatus() {
      const auth = global.IDEALAB_AUTH;
      const state = auth && typeof auth.getStatus === "function" ? auth.getStatus() : null;
      return Object.freeze({
        configured: Boolean(state && state.configured),
        authenticated: Boolean(state && state.authenticated),
        schema: "public",
        accessMode: "safe-public-views-and-invoker-rpcs",
        schemaExposureRequired: false
      });
    },
    listPublicProjects(options = {}) {
      return queryView(VIEWS.projects, query => query
        .order("published_at", { ascending: false })
        .limit(limitValue(options.limit)));
    },
    getPublicProjectBySlug(slug) {
      if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim()) || slug.length > 160) {
        return Promise.resolve(fail("INVALID_PROJECT_SLUG", "Loyiha manzili noto‘g‘ri."));
      }
      return queryView(VIEWS.projects, query => query.eq("slug", slug.trim()).limit(1))
        .then(result => {
          if (!result.ok) return result;
          return { ok: true, data: result.data[0] || null, error: null };
        });
    },
    listProjectUpdates(slug, options = {}) {
      if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim())) {
        return Promise.resolve(fail("INVALID_PROJECT_SLUG", "Loyiha manzili noto'g'ri."));
      }
      return queryView(VIEWS.updates, query => query
        .eq("project_slug", slug.trim())
        .order("published_at", { ascending: false })
        .limit(limitValue(options.limit)));
    },
    listPublicSpecialists(options = {}) {
      return queryView(VIEWS.specialists, query => query
        .order("created_at", { ascending: false })
        .limit(limitValue(options.limit)));
    },
    listPublicTeams(options = {}) {
      return queryView(VIEWS.teams, query => query
        .eq("organization_type", "team")
        .order("created_at", { ascending: false })
        .limit(limitValue(options.limit)));
    },
    listPublicResources(options = {}) {
      return queryView(VIEWS.resources, query => query
        .order("published_at", { ascending: false })
        .limit(limitValue(options.limit)));
    },
    listPublicPartnerships(options = {}) {
      return queryView(VIEWS.partnerships, query => query
        .order("published_at", { ascending: false })
        .limit(limitValue(options.limit)));
    }
,
    createProject(input = {}) {
      if (!requiredText(input.title, 3, 160)) return Promise.resolve(fail("INVALID_PROJECT_TITLE", "Loyiha nomi 3–160 belgidan iborat bo‘lishi kerak."));
      if ((input.summary || "").length > 320 || (input.description || "").length > 6000) return Promise.resolve(fail("INVALID_PROJECT_CONTENT", "Loyiha tavsifi belgilangan hajmdan oshdi."));
      return runCommand("create_project", {
        p_title: input.title.trim(),
        p_summary: input.summary || "",
        p_description: input.description || "",
        p_project_type: input.projectType || "other",
        p_visibility: input.visibility || "private",
        p_start_date: input.startDate || null,
        p_target_date: input.targetDate || null
      });
    },
    publishProjectListing(input = {}) {
      if (!isUuid(input.projectId)) return Promise.resolve(fail("INVALID_PROJECT_ID", "Loyiha identifikatori noto‘g‘ri."));
      const slug = typeof input.slug === "string" ? input.slug.trim() : "";
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length < 3 || slug.length > 100) return Promise.resolve(fail("INVALID_PROJECT_SLUG", "Ommaviy loyiha manzili noto‘g‘ri."));
      if (!requiredText(input.title, 3, 160)) return Promise.resolve(fail("INVALID_PROJECT_TITLE", "Loyiha nomi 3–160 belgidan iborat bo‘lishi kerak."));
      if (!requiredText(input.summary, 1, 600)) return Promise.resolve(fail("INVALID_PROJECT_SUMMARY", "Ommaviy qisqa tavsif 1–600 belgidan iborat bo‘lishi kerak."));
      const categories = ["startup", "social", "research", "education", "technology", "creative", "community", "other"];
      const category = categories.includes(input.category) ? input.category : "other";
      return runCommand("publish_project_listing", {
        p_project_id: input.projectId,
        p_slug: slug,
        p_title: input.title.trim(),
        p_summary: input.summary.trim(),
        p_category: category
      });
    },
    updateProject(input = {}) {
      if (!isUuid(input.projectId)) return Promise.resolve(fail("INVALID_PROJECT_ID", "Loyiha identifikatori noto‘g‘ri."));
      if (!requiredText(input.title, 3, 160)) return Promise.resolve(fail("INVALID_PROJECT_TITLE", "Loyiha nomi 3–160 belgidan iborat bo‘lishi kerak."));
      if ((input.summary || "").length > 320 || (input.description || "").length > 6000) return Promise.resolve(fail("INVALID_PROJECT_CONTENT", "Loyiha tavsifi belgilangan hajmdan oshdi."));
      return runCommand("update_project", {
        p_project_id: input.projectId,
        p_title: input.title.trim(),
        p_summary: input.summary || "",
        p_description: input.description || "",
        p_project_type: input.projectType || "other",
        p_status: input.status || "draft",
        p_visibility: input.visibility || "private",
        p_start_date: input.startDate || null,
        p_target_date: input.targetDate || null
      });
    },
    requestProjectMembership(projectId) {
      if (!isUuid(projectId)) return Promise.resolve(fail("INVALID_PROJECT_ID", "Loyiha identifikatori noto‘g‘ri."));
      return runCommand("request_project_membership", { p_project_id: projectId });
    },
    reviewProjectMembership(input = {}) {
      if (!isUuid(input.membershipId) || typeof input.approve !== "boolean") return Promise.resolve(fail("INVALID_MEMBERSHIP_DECISION", "Jamoa arizasi yoki qaror noto‘g‘ri."));
      if (input.role && !["manager", "contributor", "viewer"].includes(input.role)) return Promise.resolve(fail("INVALID_MEMBERSHIP_ROLE", "Jamoa roli noto‘g‘ri."));
      return runCommand("review_project_membership", {
        p_membership_id: input.membershipId,
        p_approve: input.approve,
        p_membership_role: input.role || null
      });
    },
    leaveProject(membershipId) {
      if (!isUuid(membershipId)) return Promise.resolve(fail("INVALID_MEMBERSHIP_ID", "A’zolik identifikatori noto‘g‘ri."));
      return runCommand("leave_project", { p_membership_id: membershipId });
    },
    listApplicationCenter(options = {}) {
      return queryPublicView("application_center", query => query
        .order("created_at", { ascending: false })
        .limit(limitValue(options.limit)));
    },
    submitProjectApplication(input = {}) {
      if (!isUuid(input.projectId)) return Promise.resolve(fail("INVALID_PROJECT_ID", "Loyiha server identifikatori noto‘g‘ri."));
      if (!requiredText(input.message, 1, 3000)) return Promise.resolve(fail("INVALID_APPLICATION_MESSAGE", "Taklif xabari 1–3000 belgidan iborat bo‘lishi kerak."));
      const amount = Number(input.amount);
      if (!Number.isFinite(amount) || amount <= 0 || amount > 1e12) return Promise.resolve(fail("INVALID_APPLICATION_AMOUNT", "Taklif summasi noto‘g‘ri."));
      const currency = typeof input.currency === "string" ? input.currency.trim().toUpperCase() : "UZS";
      if (!/^[A-Z]{3}$/.test(currency)) return Promise.resolve(fail("INVALID_CURRENCY", "Valyuta kodi noto‘g‘ri."));
      return runPublicCommand("submit_project_application", {
        p_project_id: input.projectId,
        p_applicant_note: input.message.trim(),
        p_offer_amount: amount,
        p_currency_code: currency
      });
    },
    submitProjectApplicationBySlug(input = {}) {
      const slug = typeof input.projectSlug === "string" ? input.projectSlug.trim() : "";
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 160) return Promise.resolve(fail("INVALID_PROJECT_SLUG", "Loyiha manzili noto‘g‘ri."));
      if (!requiredText(input.message, 1, 3000)) return Promise.resolve(fail("INVALID_APPLICATION_MESSAGE", "Taklif xabari 1–3000 belgidan iborat bo‘lishi kerak."));
      const amount = Number(input.amount);
      if (!Number.isFinite(amount) || amount <= 0 || amount > 1e12) return Promise.resolve(fail("INVALID_APPLICATION_AMOUNT", "Taklif summasi noto‘g‘ri."));
      const currency = typeof input.currency === "string" ? input.currency.trim().toUpperCase() : "UZS";
      if (!/^[A-Z]{3}$/.test(currency)) return Promise.resolve(fail("INVALID_CURRENCY", "Valyuta kodi noto‘g‘ri."));
      return runPublicCommand("submit_project_application_by_slug", {
        p_project_slug: slug,
        p_applicant_note: input.message.trim(),
        p_offer_amount: amount,
        p_currency_code: currency
      });
    },
    upsertProfile(input = {}) {
      if (!requiredText(input.displayName, 2, 120) || (input.headline || "").length > 160 || (input.bio || "").length > 1600) {
        return Promise.resolve(fail("INVALID_PROFILE", "Profil nomi yoki tavsifi noto‘g‘ri."));
      }
      const visibility = ["private", "unlisted", "public"].includes(input.visibility) ? input.visibility : "private";
      const username = input.username ? String(input.username).trim().toLowerCase() : null;
      if (username && !/^[a-z0-9][a-z0-9_.-]{2,29}$/.test(username)) return Promise.resolve(fail("INVALID_USERNAME", "Foydalanuvchi nomi formati noto‘g‘ri."));
      return runPublicCommand("idea_lab_upsert_profile", {
        p_display_name: input.displayName.trim(), p_username: username,
        p_headline: input.headline || "", p_bio: input.bio || "",
        p_city: input.city || null, p_country_code: input.countryCode || null,
        p_visibility: visibility
      });
    },
    upsertSpecialistProfile(input = {}) {
      const list = (value, maxItems, maxLength) => Array.isArray(value) && value.length <= maxItems &&
        value.every(item => typeof item === "string" && item.trim().length <= maxLength);
      if (!requiredText(input.publicName, 2, 100) || (input.headline || "").length > 160 ||
          (input.bio || "").length > 2400 || !list(input.skills || [], 30, 80) ||
          !list(input.categories || [], 12, 60) || !list(input.portfolioUrls || [], 8, 500) ||
          !list(input.engagementModes || ["remote"], 4, 20)) {
        return Promise.resolve(fail("INVALID_SPECIALIST_PROFILE", "Mutaxassis profili maydonlari noto‘g‘ri."));
      }
      const modes = input.engagementModes || ["remote"];
      if (!modes.length || modes.some(mode => !["remote", "onsite", "hybrid", "volunteer"].includes(mode))) {
        return Promise.resolve(fail("INVALID_ENGAGEMENT_MODE", "Ishlash shakli noto‘g‘ri."));
      }
      const availability = ["open", "limited", "unavailable"].includes(input.availabilityStatus) ? input.availabilityStatus : "open";
      const visibility = ["private", "unlisted", "public"].includes(input.visibility) ? input.visibility : "private";
      const urls = (input.portfolioUrls || []).map(value => value.trim());
      if (urls.some(value => { try { const url = new URL(value); return !["https:", "http:"].includes(url.protocol); } catch (_) { return true; } })) {
        return Promise.resolve(fail("INVALID_PORTFOLIO_URL", "Portfolio havolasi HTTP yoki HTTPS bo‘lishi kerak."));
      }
      return runPublicCommand("idea_lab_upsert_specialist_profile", {
        p_public_name: input.publicName.trim(), p_headline: input.headline || "", p_bio: input.bio || "",
        p_skill_tags: (input.skills || []).map(x => x.trim()).filter(Boolean),
        p_specialist_categories: (input.categories || []).map(x => x.trim()).filter(Boolean),
        p_city: input.city || null, p_country_code: input.countryCode || null,
        p_portfolio_urls: urls, p_availability_status: availability,
        p_engagement_modes: modes, p_visibility: visibility
      });
    },
    listMyOrganizations() {
      return runPublicCommand("idea_lab_list_my_organizations", {});
    },
    listOrganizationMembers(organizationId) {
      if (!isUuid(organizationId)) return Promise.resolve(fail("INVALID_ORGANIZATION_ID", "Tashkilot identifikatori noto‘g‘ri."));
      return runPublicCommand("idea_lab_list_organization_members", { p_organization_id: organizationId });
    },
    createOrganization(input = {}) {
      if (!requiredText(input.name, 2, 120) || (input.description || "").length > 2400) return Promise.resolve(fail("INVALID_ORGANIZATION", "Tashkilot nomi yoki tavsifi noto‘g‘ri."));
      const types = ["company", "nonprofit", "educational_institution", "community", "team", "other"];
      const visibility = ["private", "unlisted", "public"].includes(input.visibility) ? input.visibility : "private";
      return runPublicCommand("idea_lab_create_organization", {
        p_name: input.name.trim(), p_slug: input.slug || null,
        p_organization_type: types.includes(input.type) ? input.type : "other",
        p_description: input.description || "", p_location_label: input.location || null,
        p_website_url: input.websiteUrl || null, p_visibility: visibility
      });
    },
    updateOrganization(input = {}) {
      if (!isUuid(input.organizationId) || !requiredText(input.name, 2, 120)) return Promise.resolve(fail("INVALID_ORGANIZATION", "Tashkilot ma’lumoti noto‘g‘ri."));
      return runPublicCommand("idea_lab_update_organization", {
        p_organization_id: input.organizationId, p_name: input.name.trim(), p_slug: input.slug || null,
        p_organization_type: input.type || "other", p_description: input.description || "",
        p_location_label: input.location || null, p_website_url: input.websiteUrl || null,
        p_visibility: input.visibility || "private", p_status: input.status || "draft"
      });
    },
    inviteOrganizationMember(input = {}) {
      if (!isUuid(input.organizationId) || !isUuid(input.userId) || !["admin", "editor", "member"].includes(input.role || "member")) {
        return Promise.resolve(fail("INVALID_ORGANIZATION_INVITE", "Tashkilot taklif ma’lumotlari noto‘g‘ri."));
      }
      return runPublicCommand("idea_lab_invite_organization_member", {
        p_organization_id: input.organizationId, p_user_id: input.userId, p_membership_role: input.role || "member"
      });
    },
    acceptOrganizationInvite(membershipId) {
      if (!isUuid(membershipId)) return Promise.resolve(fail("INVALID_MEMBERSHIP_ID", "A’zolik identifikatori noto‘g‘ri."));
      return runPublicCommand("idea_lab_accept_organization_invite", { p_membership_id: membershipId });
    },
    requestTeamMembership(organizationId) {
      if (!isUuid(organizationId)) return Promise.resolve(fail("INVALID_ORGANIZATION_ID", "Jamoa identifikatori noto‘g‘ri."));
      return runPublicCommand("idea_lab_request_team_membership", { p_organization_id: organizationId });
    },
    reviewTeamMembership(membershipId, approve) {
      if (!isUuid(membershipId) || typeof approve !== "boolean") return Promise.resolve(fail("INVALID_MEMBERSHIP_REVIEW", "A’zolik qarori noto‘g‘ri."));
      return runPublicCommand("idea_lab_review_team_membership", { p_membership_id: membershipId, p_approve: approve });
    },
    listMyTeamMemberships() {
      return runPublicCommand("idea_lab_list_my_team_memberships", {});
    },
    createResourceOffer(input = {}) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(input.slug || "")) || !requiredText(input.title, 3, 160) ||
          !requiredText(input.category, 1, 40) || (input.description || "").length > 3000) {
        return Promise.resolve(fail("INVALID_RESOURCE_OFFER", "Resurs taklifi maydonlari noto‘g‘ri."));
      }
      return runPublicCommand("idea_lab_create_resource_offer", {
        p_project_id: isUuid(input.projectId) ? input.projectId : null, p_slug: input.slug,
        p_title: input.title.trim(), p_category: input.category, p_description: input.description || "",
        p_quantity_label: input.quantityLabel || "", p_availability_label: input.availabilityLabel || "",
        p_location_label: input.location || null, p_public_terms: input.publicTerms || "",
        p_status: input.status || "draft"
      });
    },
    updateResourceOffer(input = {}) {
      if (!isUuid(input.offerId) || !requiredText(input.title, 3, 160)) return Promise.resolve(fail("INVALID_RESOURCE_OFFER", "Resurs taklifi noto‘g‘ri."));
      return runPublicCommand("idea_lab_update_resource_offer", {
        p_offer_id: input.offerId, p_project_id: isUuid(input.projectId) ? input.projectId : null,
        p_slug: input.slug, p_title: input.title.trim(), p_category: input.category,
        p_description: input.description || "", p_quantity_label: input.quantityLabel || "",
        p_availability_label: input.availabilityLabel || "", p_location_label: input.location || null,
        p_public_terms: input.publicTerms || "", p_status: input.status || "draft"
      });
    },
    createPartnershipOpportunity(input = {}) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(input.slug || "")) || !requiredText(input.title, 3, 160) ||
          !requiredText(input.summary, 1, 600) || (input.details || "").length > 4000) {
        return Promise.resolve(fail("INVALID_PARTNERSHIP", "Hamkorlik e’loni maydonlari noto‘g‘ri."));
      }
      return runPublicCommand("idea_lab_create_partnership_opportunity", {
        p_project_id: isUuid(input.projectId) ? input.projectId : null, p_slug: input.slug,
        p_opportunity_type: input.type || "other", p_title: input.title.trim(),
        p_summary: input.summary.trim(), p_details: input.details || "",
        p_location_label: input.location || null, p_status: input.status || "draft"
      });
    },
    updatePartnershipOpportunity(input = {}) {
      if (!isUuid(input.opportunityId) || !requiredText(input.title, 3, 160) || !requiredText(input.summary, 1, 600)) {
        return Promise.resolve(fail("INVALID_PARTNERSHIP", "Hamkorlik e’loni noto‘g‘ri."));
      }
      return runPublicCommand("idea_lab_update_partnership_opportunity", {
        p_opportunity_id: input.opportunityId, p_project_id: isUuid(input.projectId) ? input.projectId : null,
        p_slug: input.slug, p_opportunity_type: input.type || "other", p_title: input.title.trim(),
        p_summary: input.summary.trim(), p_details: input.details || "",
        p_location_label: input.location || null, p_status: input.status || "draft"
      });
    },
    submitResourceRequest(input = {}) {
      if (!isUuid(input.offerId) || (input.note || "").length > 2000 || (input.quantity || "").length > 120) {
        return Promise.resolve(fail("INVALID_RESOURCE_REQUEST", "Resurs so‘rovi maydonlari noto‘g‘ri."));
      }
      return runPublicCommand("idea_lab_submit_resource_request", {
        p_offer_id: input.offerId, p_project_id: isUuid(input.projectId) ? input.projectId : null,
        p_request_note: input.note || "", p_requested_quantity: input.quantity || ""
      });
    },
    submitPartnershipEnquiry(input = {}) {
      if (!isUuid(input.opportunityId) || !requiredText(input.message, 1, 2500)) {
        return Promise.resolve(fail("INVALID_PARTNERSHIP_ENQUIRY", "Hamkorlik murojaati noto‘g‘ri."));
      }
      return runPublicCommand("idea_lab_submit_partnership_enquiry", {
        p_opportunity_id: input.opportunityId, p_project_id: isUuid(input.projectId) ? input.projectId : null,
        p_message: input.message.trim()
      });
    },
    updateProjectApplication(input = {}) {
      if (!isUuid(input.applicationId)) return Promise.resolve(fail("INVALID_APPLICATION_ID", "Ariza identifikatori noto‘g‘ri."));
      const allowed = ["in_review", "accepted", "rejected", "withdrawn"];
      if (!allowed.includes(input.status)) return Promise.resolve(fail("INVALID_APPLICATION_STATUS", "Ariza holati noto‘g‘ri."));
      if (input.reviewerNote !== undefined && (typeof input.reviewerNote !== "string" || input.reviewerNote.length > 2000)) {
        return Promise.resolve(fail("INVALID_REVIEWER_NOTE", "Izoh 2000 belgidan oshmasligi kerak."));
      }
      return runPublicCommand("update_project_application", {
        p_application_id: input.applicationId,
        p_status: input.status,
        p_reviewer_note: input.reviewerNote === undefined ? null : input.reviewerNote
      });
    }
  });
  global.IDEALAB_DATA = api;
})(typeof window !== "undefined" ? window : globalThis);
