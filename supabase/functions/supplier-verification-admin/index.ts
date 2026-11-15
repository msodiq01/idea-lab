// Supabase Edge Function: supplier-verification-admin
// Trusted administrator operations only. Service-role credentials stay server-side.

import { createClient } from "npm:@supabase/supabase-js@2";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200, origin?: string) {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "vary": "Origin",
  });
  if (origin) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-methods", "POST, OPTIONS");
    headers.set("access-control-allow-headers", "authorization, apikey, content-type, x-client-info");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function validUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

function validNote(value: unknown): value is string | null {
  return value === undefined || value === null ||
    (typeof value === "string" && value.length <= 240);
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") ?? undefined;
  const origins = new Set((Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",").map((item) => item.trim()).filter(Boolean));

  if (origin && !origins.has(origin)) return json({ error: "Origin not allowed" }, 403);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: {
      "access-control-allow-origin": origin ?? "null",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "authorization, content-type",
      "access-control-max-age": "600",
      "vary": "Origin",
    }});
  }
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);
  if ((request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase() !== "application/json") {
    return json({ error: "JSON content type required" }, 415, origin);
  }

  const token = (request.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ error: "Authentication required" }, 401, origin);

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey || origins.size === 0) {
    return json({ error: "Admin service is not configured" }, 503, origin);
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    const actor = authData.user;
    if (authError || !actor) return json({ error: "Invalid session" }, 401, origin);

    const { data: adminRecord, error: adminError } = await admin
      .from("supplier_verification_admins")
      .select("user_id")
      .eq("user_id", actor.id)
      .eq("is_active", true)
      .maybeSingle();
    if (adminError) throw adminError;
    if (!adminRecord) return json({ error: "Administrator permission required" }, 403, origin);

    const raw = await request.text();
    if (raw.length > 8192) return json({ error: "Request too large" }, 413, origin);
    let body: Record<string, unknown>;
    try { body = JSON.parse(raw); } catch { return json({ error: "Invalid JSON" }, 400, origin); }

    const note = body.note === undefined ? null : body.note;
    if (!validNote(note)) return json({ error: "Note must be 240 characters or fewer" }, 400, origin);

    if (body.action === "list_reviewers") {
      const { data, error } = await admin.from("supplier_verification_reviewers")
        .select("user_id,is_active,granted_at,granted_by,note")
        .order("granted_at", { ascending: false }).limit(200);
      if (error) throw error;
      return json({ reviewers: data ?? [] }, 200, origin);
    }

    if (body.action === "list_cases") {
      const { data, error } = await admin.from("supplier_verification_applications")
        .select("id,status,submitted_at,created_at")
        .in("status", ["submitted", "under_review", "needs_more_info"])
        .order("submitted_at", { ascending: true }).limit(200);
      if (error) throw error;
      return json({ cases: data ?? [] }, 200, origin);
    }

    if (body.action === "list_assignments") {
      let query = admin.from("supplier_verification_review_assignments")
        .select("id,application_id,reviewer_user_id,assigned_by,is_active,assignment_note,assigned_at,revoked_at")
        .order("assigned_at", { ascending: false }).limit(300);
      if (body.applicationId !== undefined) {
        if (!validUuid(body.applicationId)) return json({ error: "Invalid application ID" }, 400, origin);
        query = query.eq("application_id", body.applicationId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return json({ assignments: data ?? [] }, 200, origin);
    }

    if (body.action === "list_history") {
      const { data, error } = await admin.from("supplier_verification_assignment_events")
        .select("id,application_id,assignment_id,reviewer_user_id,actor_user_id,action,note,created_at")
        .order("created_at", { ascending: false }).limit(300);
      if (error) throw error;
      return json({ events: data ?? [] }, 200, origin);
    }

    if (body.action === "set_reviewer") {
      const reviewerUserId = body.reviewerUserId;
      const isActive = body.isActive;
      if (!validUuid(reviewerUserId) || typeof isActive !== "boolean") {
        return json({ error: "Valid reviewer user ID and active state are required" }, 400, origin);
      }
      const { data: target, error: targetError } = await admin.auth.admin.getUserById(reviewerUserId);
      if (targetError || !target.user) return json({ error: "User account not found" }, 404, origin);
      const { data, error } = await admin.rpc("admin_set_supplier_verification_reviewer", {
        p_actor_user_id: actor.id,
        p_reviewer_user_id: reviewerUserId,
        p_is_active: isActive,
        p_note: note,
      });
      if (error) throw error;
      return json({ reviewerUserId: data, isActive }, 200, origin);
    }

    if (body.action === "assign_case") {
      const applicationId = body.applicationId;
      const reviewerUserId = body.reviewerUserId;
      if (!validUuid(applicationId) || !validUuid(reviewerUserId)) {
        return json({ error: "Valid application and reviewer IDs are required" }, 400, origin);
      }
      const { data, error } = await admin.rpc("admin_assign_supplier_verification_case", {
        p_actor_user_id: actor.id,
        p_application_id: applicationId,
        p_reviewer_user_id: reviewerUserId,
        p_note: note,
      });
      if (error) throw error;
      return json({ assignmentId: data }, 201, origin);
    }

    if (body.action === "revoke_case") {
      const assignmentId = body.assignmentId;
      if (!validUuid(assignmentId)) return json({ error: "Valid assignment ID is required" }, 400, origin);
      const { data, error } = await admin.rpc("admin_revoke_supplier_verification_case", {
        p_actor_user_id: actor.id,
        p_assignment_id: assignmentId,
        p_note: note,
      });
      if (error) throw error;
      return json({ assignmentId: data, revoked: true }, 200, origin);
    }

    return json({ error: "Unsupported action" }, 400, origin);
  } catch (_error) {
    return json({ error: "Administrator request could not be completed" }, 500, origin);
  }
});
