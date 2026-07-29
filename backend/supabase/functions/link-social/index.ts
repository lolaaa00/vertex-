// link-social — records a GitHub/X identity link for an already wallet-authenticated user.
//
// Verified Supabase APIs:
//   - Identity linking is a real OAuth grant driven client-side via supabase.auth.linkIdentity()
//     https://supabase.com/docs/guides/auth/auth-identity-linking
//     ("Enable Manual Linking" must be turned on in Auth settings; user must already have a
//     session). The FRONTEND calls linkIdentity({ provider: 'github' | 'twitter' }), which
//     redirects through the real OAuth consent screen and, on return, Supabase attaches a new
//     `identity` to the SAME auth.users row — this is not something an Edge Function can (or
//     should) fabricate.
//   - supabase.auth.admin.getUserById(userId) / the identities array on the user object, exposed
//     via https://supabase.com/docs/reference/javascript/auth-admin-listusers (each user has
//     `identities: Identity[]` with `provider`, `identity_data`, `id` (= provider_user_id)).
//   - getUserIdentities()/unlinkIdentity() exist client-side for completeness but are not used here.
//
// This function's job is narrow and deliberate: after the OAuth round trip completes and the
// browser has a session bearing the new identity, the frontend calls this function with ONLY
// its Supabase access token. We look up the authoritative identity server-side (via
// admin.getUserById, never trusting any client-supplied username/handle string) and upsert
// social_connections from that verified data. This guarantees provider_username can never be a
// spoofed free-text field.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders() });
}

// Supabase's OAuth provider id for X/Twitter is "twitter" even though the product is named X.
const PROVIDER_MAP: Record<string, "github" | "x"> = {
  github: "github",
  twitter: "x",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "missing Authorization header" }, 401);
  const accessToken = authHeader.replace(/^Bearer\s+/i, "");

  // Validate the caller's session token and get their user id — never trust a client-supplied
  // user_id. https://supabase.com/docs/reference/javascript/auth-getuser
  const { data: userResult, error: userErr } = await admin.auth.getUser(accessToken);
  if (userErr || !userResult.user) return json({ error: "invalid or expired session" }, 401);
  const callerId = userResult.user.id;

  // Re-fetch the full user record via the Admin API to read the authoritative `identities` array
  // (the getUser() result above may be a cached/short view depending on SDK version).
  const { data: fullUser, error: fetchErr } = await admin.auth.admin.getUserById(callerId);
  if (fetchErr || !fullUser.user) return json({ error: "failed to load user" }, 500);

  const identities = fullUser.user.identities ?? [];
  const linked = identities.filter((i) => i.provider in PROVIDER_MAP);

  if (linked.length === 0) {
    return json({ error: "no linked github/twitter identity found on this session yet" }, 400);
  }

  const results = [];
  for (const identity of linked) {
    const provider = PROVIDER_MAP[identity.provider];
    const providerUserId = identity.identity_data?.provider_id ?? identity.id;
    const providerUsername =
      identity.identity_data?.user_name ??
      identity.identity_data?.preferred_username ??
      identity.identity_data?.screen_name ??
      identity.identity_data?.name ??
      providerUserId;

    const { data, error } = await admin
      .from("social_connections")
      .upsert(
        {
          user_id: callerId,
          provider,
          provider_user_id: String(providerUserId),
          provider_username: String(providerUsername),
        },
        { onConflict: "user_id,provider" },
      )
      .select()
      .single();

    if (error) return json({ error: "failed to persist social connection", detail: error.message }, 500);
    results.push(data);
  }

  return json({ linked: results });
});
