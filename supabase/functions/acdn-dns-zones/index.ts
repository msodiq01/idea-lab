// IDEA LAB — Read-only ACDN DNS-zone connector
// Supabase Edge Function. Requires Supabase JWT verification (verify_jwt=true).
// Secrets: ACDN_API_TOKEN, SUPABASE_URL, SUPABASE_ANON_KEY, ACDN_ALLOWED_USER_ID.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const token = Deno.env.get("ACDN_API_TOKEN");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const allowedUserId = Deno.env.get("ACDN_ALLOWED_USER_ID");

  if (!token || !supabaseUrl || !supabaseAnonKey || !allowedUserId) {
    return json({ error: "Connector is not configured" }, 503);
  }

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return json({ error: "Authentication required" }, 401);
  }

  // Validate caller's Supabase session before allowing DNS-zone data access.
  const userResponse = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: authorization,
    },
  });

  if (!userResponse.ok) return json({ error: "Invalid session" }, 401);
  const user = await userResponse.json();

  // Restrict this integration to the explicitly configured account owner.
  if (user?.id !== allowedUserId) return json({ error: "Forbidden" }, 403);

  try {
    const acdnResponse = await fetch("https://acdn.uz/api/user/dns-zones", {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!acdnResponse.ok) {
      return json({ error: "ACDN request failed", status: acdnResponse.status }, 502);
    }

    const data = await acdnResponse.json();
    return json(data);
  } catch {
    return json({ error: "ACDN connection failed" }, 502);
  }
});
