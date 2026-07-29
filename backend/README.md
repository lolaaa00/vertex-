# Vertex Backend — Supabase

100% Supabase-hosted: Postgres + Auth + Storage + Edge Functions + pg_cron. There is
**no standalone server process** anywhere in this backend — nothing that can crash,
OOM, or need a restart. The "must never die" / 24/7-uptime requirement is satisfied
structurally: Edge Functions are invoked on-demand by HTTP request or by a
`pg_cron` + `pg_net` schedule running inside Supabase's own Postgres instance, not by
a process we operate.

## Layout

```
backend/
  supabase/
    migrations/
      0001_init.sql            -- core schema, RLS policies
      0002_search_and_views.sql -- full-text search, analytics/profile views
    functions/
      wallet-auth/             -- SIWE-style nonce + signature verify + session mint
      link-social/             -- persists verified GitHub/X OAuth identity links
      sync-chain-state/        -- scheduled: mirrors GenLayer contract state -> Postgres
      relay-notification/      -- creates notification rows (called by sync-chain-state)
  scripts/
    setup_cron.sql             -- pg_cron + pg_net schedule for sync-chain-state
```

## One-time setup

```bash
# from backend/
supabase init                      # if not already a Supabase project locally
supabase link --project-ref <your-project-ref>
supabase db push                   # applies 0001_init.sql, 0002_search_and_views.sql

supabase functions deploy wallet-auth
supabase functions deploy link-social
supabase functions deploy sync-chain-state
supabase functions deploy relay-notification
```

Then run `scripts/setup_cron.sql` against your project (Supabase Studio SQL editor, or
`supabase db execute -f scripts/setup_cron.sql` / `psql`) **after** filling in the real
project URL and service_role key (or storing them via the dashboard's Vault UI first).
This wires `sync-chain-state` to run every 1 minute via `pg_cron` + `pg_net`, per
https://supabase.com/docs/guides/functions/schedule-functions.

## Required secrets

Set with `supabase secrets set KEY=value` (these are available to Edge Functions as
`Deno.env.get(...)`; `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are auto-injected by
the platform into every Edge Function and do not need to be set manually):

| Secret | Used by | Notes |
|---|---|---|
| `GENLAYER_CONTRACT_ADDRESS` | sync-chain-state | **A verified working test deployment exists**: `0x612Dc3dA6d40cAF105185A07DC398D0f14A46e3e` (StudioNet — see `intelligent-contract/README.md` "Deployment status"). Function no-ops cleanly if unset, so it's safe to leave blank until you decide which address (this test one, or a fresh owner-controlled deploy) is authoritative. |
| `GENLAYER_RPC_URL` | sync-chain-state | GenLayer StudioNet RPC endpoint: `https://studio.genlayer.com/api` (confirmed via `genlayer network info`). |
| `GENLAYER_CHAIN` | sync-chain-state | Name of the genlayer-js chain preset. **Still flagged/unverified** — `genlayer-js@0.3.4` (used by the frontend) has no `studionet` export in `genlayer-js/chains`, only `simulator`; the frontend works around this by defining the StudioNet chain manually via `viem`'s `defineChain` (see `frontend/lib/genlayer.ts`). This Edge Function imports `genlayer-js@0.9.1` from esm.sh (a different, newer version) — re-verify whether that version exports a `studionet` preset before relying on the `GENLAYER_CHAIN` env default; if not, port the same manual `defineChain` workaround here. |
| `WALLET_EMAIL_DOMAIN` | wallet-auth | Domain used for the synthetic per-wallet email, e.g. `wallet.vertex.local`. Optional, has a default. |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | Supabase Auth (dashboard config, not a function secret) | Configured in Supabase Dashboard -> Authentication -> Providers -> GitHub. |
| `TWITTER_CLIENT_ID` / `TWITTER_CLIENT_SECRET` | Supabase Auth (dashboard config) | Configured in Supabase Dashboard -> Authentication -> Providers -> Twitter (X). Requires "Enable Manual Linking" turned on for `linkIdentity()` to work — see https://supabase.com/docs/guides/auth/auth-identity-linking. |

## Auth model

- **Login**: wallet-only, via `functions/wallet-auth`. No password is ever stored or
  used by end users.
- **Social linking**: GitHub/X are never a login method. The frontend, once the user
  already has a wallet-derived session, calls Supabase's own
  `supabase.auth.linkIdentity({ provider: 'github' | 'twitter' })` client-side (real
  OAuth grant). After the redirect completes, the frontend calls
  `functions/link-social` with its access token; the function reads the *server-side*
  identity record via `auth.admin.getUserById` and writes `social_connections` from
  that — never from a client-typed username.
- **RLS**: every table has RLS enabled. Marketplace data (bounties, submissions,
  contribution_graph_entries, social_connections, profiles) is publicly readable.
  Users can only write their own `profiles` row and mark their own `notifications`
  read. All other writes (bounty/submission/graph mirroring, notification creation)
  happen exclusively through Edge Functions using the `service_role` key, which
  bypasses RLS by design — this is the standard Supabase pattern for
  server-authoritative writes (https://supabase.com/docs/guides/auth/row-level-security).

## Wallet-auth session-minting approach (verify before relying on it)

Supabase's Admin API can create a user (`auth.admin.createUser`) but has **no method
that directly returns a live session** for an arbitrary user id — this was confirmed
against the current JS reference docs (`auth-admin-createuser`,
`auth-admin-generatelink`, `auth-verifyotp` — see URLs in
`functions/wallet-auth/index.ts`). The documented/community-verified workaround, which
this project uses, is:

1. Edge Function verifies the wallet signature server-side.
2. Edge Function calls `admin.generateLink({ type: 'magiclink', email })` to mint a
   one-time `hashed_token` **without sending an email**.
3. Edge Function returns `{ email, hashed_token }` to the frontend.
4. Frontend calls `supabase.auth.verifyOtp({ email, token: hashed_token, type: 'email' })`
   using the public anon client — this is the step that actually establishes a real,
   persisted Supabase session (access + refresh token) in the browser.

**Flag**: this generateLink -> verifyOtp handoff is the best-verified current pattern
found via docs + community write-ups, but Supabase has no first-class "Web3 wallet
auth" API — re-check `https://supabase.com/docs/guides/auth` for a native wallet
provider before your ship date in case one has since shipped.

## GenLayer sync

`functions/sync-chain-state` reads bounty/submission/contribution-graph state via
`genlayer-js`'s `createClient` + `readContract` (verified against
https://docs.genlayer.com/api-references/genlayer-js) and upserts into Postgres,
keyed on `chain_bounty_id` / `chain_submission_id` / `(bounty_id, contributor_wallet,
category)` so re-runs never duplicate rows. The contract read function names used here
(`get_bounties`, `get_submissions`, `get_contribution_graph`) **now match the real
deployed ABI** — confirmed against the verified deployment above via
`genlayer call <address> get_bounties` etc. Set `GENLAYER_CONTRACT_ADDRESS` to enable
this function; it remains a clean no-op while unset.

## Local development

```bash
supabase start
supabase functions serve wallet-auth --env-file .env.local
```
