// relay-notification — creates notification rows for events detected by sync-chain-state
// (e.g. a contribution graph entry just settled on-chain and the contributor was paid).
//
// This function is intentionally trusted-caller-only: it is invoked with the service_role key
// (by sync-chain-state, or manually by an admin/ops script), never directly by end users, since
// notifications.insert has no client-facing RLS policy (see 0001_init.sql). It resolves the
// wallet address to a profiles.id server-side so a caller can never forge a notification for
// an arbitrary user_id.
//
// Verified API: standard supabase-js `.from(...).insert(...)` — no special/new API surface here.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

interface RelayPayload {
  bounty_id: string;
  contributor_wallet: string;
  reward_owed_gen: string;
  type?: string;
}

serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  // Only accept calls carrying the service_role key — this function must never be reachable
  // from end-user browsers directly.
  const auth = req.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return json({ error: "forbidden — service role only" }, 403);
  }

  let payload: RelayPayload;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const { bounty_id, contributor_wallet, reward_owed_gen, type = "reward_settled" } = payload;
  if (!bounty_id || !contributor_wallet) {
    return json({ error: "bounty_id and contributor_wallet are required" }, 400);
  }

  const { data: profile, error: profileErr } = await db
    .from("profiles")
    .select("id")
    .eq("wallet_address", contributor_wallet.toLowerCase())
    .maybeSingle();

  if (profileErr) return json({ error: "failed to look up profile", detail: profileErr.message }, 500);
  if (!profile) {
    // Contributor hasn't logged into Vertex yet (no profile row) — nothing to notify.
    return json({ status: "skipped", reason: "no profile for wallet" });
  }

  const { data: bounty } = await db.from("bounties").select("title").eq("id", bounty_id).maybeSingle();

  const { data, error } = await db
    .from("notifications")
    .insert({
      user_id: profile.id,
      type,
      payload: {
        bounty_id,
        bounty_title: bounty?.title ?? null,
        reward_owed_gen,
      },
    })
    .select()
    .single();

  if (error) return json({ error: "failed to insert notification", detail: error.message }, 500);
  return json({ status: "ok", notification: data });
});
