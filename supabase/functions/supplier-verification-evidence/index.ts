// Supabase Edge Function: supplier-verification-evidence
// Deploy only after reviewing migrations and configuring server-side secrets.
// Never expose SUPABASE_SERVICE_ROLE_KEY to browser code.

import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "supplier-verification-private";
const MAX_BYTES = 10 * 1024 * 1024;
const DOWNLOAD_TTL_SECONDS = 60;
const DOCUMENT_TYPES = new Set([
  "business_registration",
  "representative_authority",
  "business_address",
  "other",
]);
const MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
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
    headers.set("access-control-allow-headers", "authorization, content-type");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function allowedOrigins(): Set<string> {
  return new Set(
    (Deno.env.get("ALLOWED_ORIGINS") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

function validUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin") ?? undefined;
  const origins = allowedOrigins();
  if (origin && !origins.has(origin)) return json({ error: "Origin not allowed" }, 403);
  if (request.method === "OPTIONS") {
    if (origin && !origins.has(origin)) return json({ error: "Origin not allowed" }, 403);
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": origin ?? "null",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "authorization, content-type",
        "access-control-max-age": "600",
        "vary": "Origin",
      },
    });
  }
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);
  if ((request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase() !== "application/json") {
    return json({ error: "JSON content type required" }, 415, origin);
  }
  const authHeader = request.headers.get("authorization") ?? "";
  const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!tokenMatch) return json({ error: "Authentication required" }, 401, origin);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey || origins.size === 0) {
    return json({ error: "Evidence service is not configured" }, 503, origin);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: authData, error: authError } = await admin.auth.getUser(tokenMatch[1]);
    const actor = authData.user;
    if (authError || !actor) return json({ error: "Invalid session" }, 401, origin);

    const rawBody = await request.text();
    if (rawBody.length > 8192) return json({ error: "Request too large" }, 413, origin);
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return json({ error: "Invalid JSON" }, 400, origin);
    }

    const action = body.action;
    if (action === "upload_ticket") {
      const applicationId = body.applicationId;
      const documentType = body.documentType;
      if (!validUuid(applicationId) || typeof documentType !== "string" || !DOCUMENT_TYPES.has(documentType)) {
        return json({ error: "Invalid application or document type" }, 400, origin);
      }

      const { data: application, error } = await admin
        .from("supplier_verification_applications")
        .select("id,supplier_user_id,status")
        .eq("id", applicationId)
        .maybeSingle();
      if (error) throw error;
      if (!application || application.supplier_user_id !== actor.id) {
        return json({ error: "Application not found" }, 404, origin);
      }
      if (!["submitted", "needs_more_info"].includes(application.status)) {
        return json({ error: "Application does not accept evidence uploads" }, 409, origin);
      }

      const path = `${applicationId}/${documentType}/${crypto.randomUUID()}`;
      const { data, error: ticketError } = await admin.storage
        .from(BUCKET)
        .createSignedUploadUrl(path, { upsert: false });
      if (ticketError || !data) throw ticketError ?? new Error("Upload ticket unavailable");
      return json({
        action: "upload_ticket",
        bucket: BUCKET,
        path,
        token: data.token,
        maxBytes: MAX_BYTES,
        allowedMimeTypes: [...MIME_TYPES],
        note: "Upload ticket is temporary. Finalize only after the object upload completes.",
      }, 200, origin);
    }

    if (action === "finalize_upload") {
      const applicationId = body.applicationId;
      const documentType = body.documentType;
      const path = body.path;
      if (!validUuid(applicationId) || typeof documentType !== "string" ||
          !DOCUMENT_TYPES.has(documentType) || typeof path !== "string" ||
          !path.startsWith(`${applicationId}/${documentType}/`)) {
        return json({ error: "Invalid evidence reference" }, 400, origin);
      }

      const { data: application, error } = await admin
        .from("supplier_verification_applications")
        .select("id,supplier_user_id,status")
        .eq("id", applicationId)
        .maybeSingle();
      if (error) throw error;
      if (!application || application.supplier_user_id !== actor.id) {
        return json({ error: "Application not found" }, 404, origin);
      }
      if (!["submitted", "needs_more_info"].includes(application.status)) {
        return json({ error: "Application does not accept evidence" }, 409, origin);
      }

      const filename = path.split("/").at(-1)!;
      if (!UUID_RE.test(filename) || path.split("/").length !== 3) {
        return json({ error: "Invalid opaque object name" }, 400, origin);
      }
      const folder = `${applicationId}/${documentType}`;
      const { data: objects, error: listError } = await admin.storage
        .from(BUCKET)
        .list(folder, { search: filename, limit: 10 });
      if (listError) throw listError;
      const object = objects?.find((item) => item.name === filename);
      if (!object) return json({ error: "Uploaded object not found" }, 404, origin);

      const metadata = object.metadata ?? {};
      const contentType = metadata.mimetype ?? metadata.contentType;
      const size = Number(metadata.size);
      if (!MIME_TYPES.has(contentType) || !Number.isFinite(size) || size <= 0 || size > MAX_BYTES) {
        return json({ error: "File type or size is not allowed" }, 415, origin);
      }

      const { data: existing, error: existingError } = await admin
        .from("supplier_verification_evidence")
        .select("id")
        .eq("private_storage_path", path)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing) return json({ error: "Evidence already finalized" }, 409, origin);

      const { data: evidence, error: insertError } = await admin
        .from("supplier_verification_evidence")
        .insert({
          application_id: applicationId,
          document_type: documentType,
          private_storage_path: path,
        })
        .select("id,application_id,document_type,uploaded_at")
        .single();
      if (insertError) throw insertError;
      return json({ action: "finalize_upload", evidence }, 201, origin);
    }

    if (action === "download_ticket") {
      const evidenceId = body.evidenceId;
      if (!validUuid(evidenceId)) return json({ error: "Invalid evidence reference" }, 400, origin);

      const { data: evidence, error } = await admin
        .from("supplier_verification_evidence")
        .select("id,application_id,private_storage_path,document_type")
        .eq("id", evidenceId)
        .maybeSingle();
      if (error) throw error;
      if (!evidence) return json({ error: "Evidence not found" }, 404, origin);

      const { data: application, error: applicationError } = await admin
        .from("supplier_verification_applications")
        .select("supplier_user_id")
        .eq("id", evidence.application_id)
        .maybeSingle();
      if (applicationError) throw applicationError;
      const isOwner = application?.supplier_user_id === actor.id;
      const { data: reviewerRecord, error: reviewerError } = await admin
        .from("supplier_verification_review_assignments")
        .select("id")
        .eq("application_id", evidence.application_id)
        .eq("reviewer_user_id", actor.id)
        .eq("is_active", true)
        .maybeSingle();
      if (reviewerError) throw reviewerError;
      const { data: activeReviewer, error: activeReviewerError } = await admin
        .from("supplier_verification_reviewers")
        .select("user_id")
        .eq("user_id", actor.id)
        .eq("is_active", true)
        .maybeSingle();
      if (activeReviewerError) throw activeReviewerError;
      const isAssignedReviewer = Boolean(reviewerRecord && activeReviewer);
      if (!isOwner && !isAssignedReviewer) return json({ error: "Not authorized" }, 403, origin);

      const { data: signed, error: signError } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(evidence.private_storage_path, DOWNLOAD_TTL_SECONDS);
      if (signError || !signed) throw signError ?? new Error("Download link unavailable");

      const { error: auditError } = await admin
        .from("supplier_verification_evidence_access_events")
        .insert({
          evidence_id: evidence.id,
          application_id: evidence.application_id,
          actor_user_id: actor.id,
          action: "download_link_issued",
        });
      if (auditError) throw auditError;

      return json({
        action: "download_ticket",
        signedUrl: signed.signedUrl,
        expiresInSeconds: DOWNLOAD_TTL_SECONDS,
        note: "Audit records issuance of this link, not proof that the file was downloaded.",
      }, 200, origin);
    }

    return json({ error: "Unsupported action" }, 400, origin);
  } catch (_error) {
    return json({ error: "Evidence request could not be completed" }, 500, origin);
  }
});
