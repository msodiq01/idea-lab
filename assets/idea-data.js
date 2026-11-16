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
  });

  global.IDEALAB_DATA = api;
})(typeof window !== "undefined" ? window : globalThis);
