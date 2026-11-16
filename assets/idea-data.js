/* IDEA LAB — read-only Supabase data gateway
 * Safe by default: requires the existing Auth adapter and explicit Supabase config.
 * Uses only reviewed public invoker views in idea_app; no direct table writes.
 * Data API schema exposure is a separate deployment gate and remains disabled.
 */
((global) => {
  "use strict";

  if (global.IDEALAB_DATA) return;

  const VIEWS = Object.freeze({
    projects: "public_project_directory",
    updates: "public_project_updates",
    specialists: "public_specialist_directory",
    resources: "public_resource_catalogue",
    partnerships: "public_partnership_directory"
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
      const response = await client.schema("idea_app").rpc(name, args);
      if (response && response.error) {
        return fail("COMMAND_FAILED", "Amal bajarilmadi. Ruxsatlar va backend migratsiyalarini tekshirish kerak.");
      }
      return { ok: true, data: response ? response.data : null, error: null };
    } catch (_) {
      return fail("COMMAND_FAILED", "Backend amali bajarilmadi.");
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
      let query = client.schema("idea_app").from(view).select("*");
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
        schema: "idea_app",
        accessMode: "reviewed-public-views-only",
        schemaExposureRequired: true
      });
    },
    listPublicProjects(options = {}) {
      return queryView(VIEWS.projects, query => query
        .order("published_at", { ascending: false })
        .limit(limitValue(options.limit)));
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
    }
  });

    listApplicationCenter(options = {}) {
      return queryView("application_center", query => query
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
      return runCommand("submit_project_application", {
        p_project_id: input.projectId,
        p_applicant_note: input.message.trim(),
        p_offer_amount: amount,
        p_currency_code: currency
      });
    },
    updateProjectApplication(input = {}) {
      if (!isUuid(input.applicationId)) return Promise.resolve(fail("INVALID_APPLICATION_ID", "Ariza identifikatori noto‘g‘ri."));
      const allowed = ["in_review", "accepted", "rejected", "withdrawn"];
      if (!allowed.includes(input.status)) return Promise.resolve(fail("INVALID_APPLICATION_STATUS", "Ariza holati noto‘g‘ri."));
      if (input.reviewerNote !== undefined && (typeof input.reviewerNote !== "string" || input.reviewerNote.length > 2000)) {
        return Promise.resolve(fail("INVALID_REVIEWER_NOTE", "Izoh 2000 belgidan oshmasligi kerak."));
      }
      return runCommand("update_project_application", {
        p_application_id: input.applicationId,
        p_status: input.status,
        p_reviewer_note: input.reviewerNote === undefined ? null : input.reviewerNote
      });
    },
  global.IDEALAB_DATA = api;
})(typeof window !== "undefined" ? window : globalThis);
