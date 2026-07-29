// wallet-auth — SIWE-style wallet login for Vertex
//
// Verified Supabase APIs used here (do not deviate without re-verifying):
//   - supabase.auth.admin.createUser / listUsers / getUserByEmail-equivalent (via listUsers filter):
//     https://supabase.com/docs/reference/javascript/auth-admin-createuser
//     Returns a USER, not a session — the Admin API has no "mint session directly" method.
//   - supabase.auth.admin.generateLink({ type: 'magiclink', email }):
//     https://supabase.com/docs/reference/javascript/auth-admin-generatelink
//     Returns `properties.hashed_token` (a one-time email OTP token) without sending any email.
//   - Client then calls supabase.auth.verifyOtp({ email, token: hashed_token, type: 'email' })
//     https://supabase.com/docs/reference/javascript/auth-verifyotp
//     which DOES establish a real Supabase session (access_token + refresh_token).
//   This generateLink -> verifyOtp handoff is the documented/community-verified pattern for
//   minting a Supabase session from a server-verified non-password credential (confirmed via
//   Supabase docs + "Supabase — admin login as user" write-up, since Supabase has no first-class
//   Web3/wallet auth provider). We deliberately do NOT invent a `signInWithIdToken` wallet flow —
//   that API is for OIDC id_tokens (Google/Apple/etc), not raw signatures.
//
// Flow:
//   POST { action: "nonce", address }         -> { nonce, message, expires_at }
//   POST { action: "verify", address, signature } -> { hashed_token, email, user_id }
//     Client takes { hashed_token, email } and calls supabase.auth.verifyOtp({ email, token: hashed_token, type: "email" })
//     directly against the project's public anon key to receive a real session. We return the
//     token rather than a session object because only the browser's supabase-js instance can
//     turn it into a persisted session (cookies/localStorage) correctly.
//
// Signature verification: EIP-191 personal_sign recovery via viem (Deno-compatible ESM build),
// per https://viem.sh/docs/utilities/recoverMessageAddress — recovers the signer address from
// the signed challenge message and requires it to equal the claimed address (case-insensitive).

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { recoverMessageAddress, isAddress, getAddress } from "https://esm.sh/viem@2.21.19";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WALLET_EMAIL_DOMAIN = Deno.env.get("WALLET_EMAIL_DOMAIN") ?? "wallet.vertex.local";
const NONCE_TTL_SECONDS = 5 * 60;

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

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function buildChallengeMessage(address: string, nonce: string, issuedAt: string): string {
  // Simplified SIWE-style message (not full EIP-4361 domain-binding since this serves a single
  // known frontend origin; adjust `domain`/`uri` fields if multi-origin support is needed later).
  return [
    `vertex.app wants you to sign in with your Ethereum account:`,
    getAddress(address),
    ``,
    `Sign in to Vertex bounty marketplace. This request will not trigger a blockchain transaction or cost any gas.`,
    ``,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
  ].join("\n");
}

function walletEmailFor(address: string): string {
  return `${address.toLowerCase()}@${WALLET_EMAIL_DOMAIN}`;
}

async function handleNonce(address: string) {
  if (!isAddress(address)) return json({ error: "invalid address" }, 400);
  const normalized = address.toLowerCase();
  const nonce = randomNonce();
  const issuedAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + NONCE_TTL_SECONDS * 1000).toISOString();

  const { error } = await admin.from("wallet_auth_nonces").insert({
    address: normalized,
    nonce,
    expires_at: expiresAt,
  });
  if (error) return json({ error: "failed to issue nonce", detail: error.message }, 500);

  const message = buildChallengeMessage(normalized, nonce, issuedAt);
  return json({ nonce, message, expires_at: expiresAt });
}

async function handleVerify(address: string, signature: string, message: string) {
  if (!isAddress(address)) return json({ error: "invalid address" }, 400);
  if (!signature || !message) return json({ error: "signature and message are required" }, 400);
  const normalized = address.toLowerCase();

  const nonceMatch = message.match(/Nonce:\s*([0-9a-f]+)/i);
  if (!nonceMatch) return json({ error: "message missing nonce" }, 400);
  const nonce = nonceMatch[1];

  const { data: nonceRow, error: nonceErr } = await admin
    .from("wallet_auth_nonces")
    .select("*")
    .eq("address", normalized)
    .eq("nonce", nonce)
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (nonceErr || !nonceRow) return json({ error: "nonce invalid, expired, or already used" }, 401);

  let recovered: string;
  try {
    recovered = await recoverMessageAddress({ message, signature: signature as `0x${string}` });
  } catch (e) {
    return json({ error: "signature recovery failed", detail: String(e) }, 401);
  }

  if (recovered.toLowerCase() !== normalized) {
    return json({ error: "signature does not match claimed address" }, 401);
  }

  // Consume the nonce immediately so it cannot be replayed.
  const { error: consumeErr } = await admin
    .from("wallet_auth_nonces")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", nonceRow.id);
  if (consumeErr) return json({ error: "failed to consume nonce" }, 500);

  const email = walletEmailFor(normalized);

  // Find-or-create the Supabase Auth user for this wallet, then upsert the profile row.
  let userId: string;
  const { data: existing, error: listErr } = await admin.auth.admin.listUsers({
    // listUsers doesn't support filtering by email directly in all versions; page and match.
    page: 1,
    perPage: 1000,
  });
  if (listErr) return json({ error: "failed to look up user", detail: listErr.message }, 500);

  const found = existing.users.find((u) => u.email?.toLowerCase() === email);

  if (found) {
    userId = found.id;
  } else {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { wallet_address: normalized },
      app_metadata: { provider: "wallet", wallet_address: normalized },
    });
    if (createErr || !created.user) {
      return json({ error: "failed to create user", detail: createErr?.message }, 500);
    }
    userId = created.user.id;
  }

  const { error: profileErr } = await admin.from("profiles").upsert(
    { id: userId, wallet_address: normalized },
    { onConflict: "id" },
  );
  if (profileErr) return json({ error: "failed to upsert profile", detail: profileErr.message }, 500);

  // Mint a one-time OTP token the client exchanges for a real session via
  // supabase.auth.verifyOtp({ email, token: hashed_token, type: "email" }).
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkErr || !linkData) return json({ error: "failed to mint session token", detail: linkErr?.message }, 500);

  return json({
    email,
    hashed_token: linkData.properties.hashed_token,
    user_id: userId,
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const body = await req.json();
    const { action, address } = body;

    if (action === "nonce") return await handleNonce(address);
    if (action === "verify") return await handleVerify(address, body.signature, body.message);

    return json({ error: "unknown action, expected 'nonce' or 'verify'" }, 400);
  } catch (e) {
    return json({ error: "bad request", detail: String(e) }, 400);
  }
});
