# Vertex — Project Memory

Persistent context for anyone (human or agent) picking this project up later.
Update this file whenever a decision, blocker, or non-obvious fact changes.

**This project was built by one person (the repo owner, a GitHub collaborator
on this repo) for another person to take over and ship.** Whoever continues
this should read "HANDOFF STATUS" first, then "NEXT STEPS" in order. Every
credential in the "ALL REQUIRED KEYS" table is still an unfilled placeholder
— **except the GenLayer contract, which is written, deployed, and verified
working** (see below). Nothing else is wired to a real account/key yet.

## HANDOFF STATUS (read this first) — last updated 2026-07-29

### ✅ Done and verified (no further work needed)
- **Repo scaffold** — folder structure, `.gitignore`, this memory file.
- **Intelligent Contract** (`intelligent-contract/contracts/vertex_bounty_fusion.py`,
  ~1306 lines): written, lint-clean, 34/34 direct unit tests passing, **and
  deployed + verified live on GenLayer StudioNet**:
  - Address: `0x612Dc3dA6d40cAF105185A07DC398D0f14A46e3e`
  - Verified via `genlayer call <address> get_config` / `get_categories` /
    `get_bounties` — all returned correct live data, not errors.
  - Full bounty lifecycle confirmed present: create → submit → close
    submissions → evaluate (5-validator comparative equivalence,
    Contribution Graph reasoning over real fetched web evidence) → settle
    GEN payouts, plus cancellation and sponsor-timeout recovery paths.
  - **Important CLI quirk discovered**: deploying via `genlayer deploy`
    (CLI v0.39.2) can print "Contract deployed successfully" while the
    transaction actually fails (`invalid_contract` in the finalized
    receipt) — this happened once during testing for reasons never fully
    root-caused (a control deploy of an unrelated reference contract via
    the identical CLI command succeeded, ruling out network/account/CLI
    version as the systemic cause). **Deploying the same, unmodified
    contract via the GenLayer Studio web UI worked on the first try.** If
    the CLI ever reports `invalid_contract` again, don't assume the
    contract is broken — try the Studio web UI first. Full detail in
    `intelligent-contract/README.md`.
  - This deployed address is a **verified test deployment**, superseded below
    by an owner-controlled deployment. The contract code itself is proven
    working either way.

- **Owner-controlled deployment (2026-07-30)** — the project owner deployed
  a fresh instance so they hold the `owner` role:
  - Address: `0xd942430229dD389fabeA73699Ffd9b09549b51D5`
  - Constructor args: `min_bond_default=0`, `timeout_grace_seconds=259200`
    (3 days — production-realistic, not the 3600s fast-testing value)
  - Verified via `genlayer call <address> get_config` (confirms
    `owner: 0x5601091213049D1C92d99728aa6e8C630e4d7938`, `paused: false`,
    `timeout_grace_seconds: 259200`) and `get_categories` (returns the 5
    reward categories) — both returned correct live data.
  - **This is now the authoritative contract address for the project.**
    `frontend/.env.local` has `NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS` set to
    this address. The old test-deployment address above is retained for
    reference only — do not point any new env file at it.
- **Frontend** (`frontend/`): Next.js App Router + TypeScript + Tailwind.
  **All required pages exist and were visually verified running** (not just
  scaffolded) on 2026-07-29 via `npm run dev`: landing, bounty explorer,
  bounty detail + submission form, Contribution Graph visualization (the
  animated radial-node graph from the design prototype, rebuilt in React),
  dashboard, admin, wallet, auth, settings, search, analytics, profile,
  shared error/empty/loading states, global nav + notifications. Custom
  Vertex logo/favicon (`frontend/app/icon.svg`). `npm run build` **passes
  cleanly** (26/26 static pages) — see "Frontend build fix" below for what
  was wrong and how it was fixed.
- **Backend** (`backend/supabase/`): Postgres schema + RLS policies, wallet
  signature auth (SIWE-style, no custodial keys), GitHub/X OAuth account
  **linking** (not login), Edge Functions for chain-state sync
  (`sync-chain-state`) and notifications (`relay-notification`), Cron setup
  script. Contract read function names in `sync-chain-state`
  (`get_bounties`, `get_submissions`, `get_contribution_graph`) **now
  confirmed to match the real deployed ABI**. **Not yet connected to a real
  Supabase project** — see NEXT STEPS.

### Frontend build fix (2026-07-29)
The build was failing on `lib/genlayer.ts`, which imported a `studionet`
export from `genlayer-js/chains` that doesn't exist in that package version
(`genlayer-js@0.3.4` only ships a `simulator` chain preset for the local
GenVM simulator). Fixed by defining StudioNet manually via `viem`'s
`defineChain`, using the real chain ID (`61999`) and RPC
(`https://studio.genlayer.com/api`), confirmed via `genlayer network info`
— the same way `genlayer-js` defines `simulator` internally. If you bump
`genlayer-js` versions later, re-check whether a real `studionet` export
has since been added and prefer that over the manual workaround.

The backend's `sync-chain-state` function imports a *different* genlayer-js
version (`0.9.1` via esm.sh) and has its own defensive fallback/error for a
missing chain preset — not yet confirmed whether that version exports
`studionet` natively. Worth checking before relying on `GENLAYER_CHAIN` env
default in production.

### ⏳ Needs verification (not blocking, but unresolved)
- **Update 2026-07-30**: confirmed via `docs.supabase.com/guides/auth/auth-web3`
  — Supabase now has a first-class native Web3 wallet auth provider,
  `supabase.auth.signInWithWeb3({ chain: 'ethereum' | 'solana', statement })`,
  using the EIP-4361 (Sign-In with Ethereum) standard. It handles nonce
  generation, signature verification, and session minting entirely
  server-side inside Supabase Auth — **this should replace** the custom
  `generateLink`+`verifyOtp` workaround in
  `backend/supabase/functions/wallet-auth/index.ts` and the corresponding
  frontend wiring. Recommended follow-up task (not yet done, deliberately
  deferred to finish OAuth app registration first): delete/simplify
  `wallet-auth` Edge Function, call `signInWithWeb3` directly from the
  frontend's `lib/wallet.ts`/`lib/supabase.ts`, enable the "Web3 Wallet"
  provider in Supabase dashboard (Authentication → Providers), configure
  Redirect URLs to match the app's sign-in page, and turn on CAPTCHA +
  rate limiting (Web3 accounts have no email/phone, so they're easy to
  spam without it).
- Whether `genlayer-js@0.9.1` (used only by the backend Edge Function)
  exports a `studionet` chain preset — see above.
- The Supabase dashboard's new API-keys UI no longer surfaces a classic JWT
  secret field (only publishable/secret key pairs and legacy anon/service_role
  JWTs) — `SUPABASE_JWT_SECRET` from the required-keys table below may no
  longer apply to new projects. Not needed unless custom JWT verification is
  added later.

### ❌ Not started / explicitly deferred — these are the real remaining steps
- **Vercel/production deployment** — nothing has been deployed; Vercel CLI
  is installed locally but no `vercel` project has been linked.
- Wiring the frontend to real Supabase data (currently mock data with
  explicit `// TODO: wire to <service>` comments throughout — the contract
  data itself can be wired now since it's live, see NEXT STEPS).

## NEXT STEPS (in order, for whoever continues this)

1. ✅ **Contract address decided** — owner-controlled instance deployed at
   `0xd942430229dD389fabeA73699Ffd9b09549b51D5` (see HANDOFF STATUS above).
   `frontend/.env.local`'s `NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS` is set.
2. ✅ **Supabase project created and wired up (2026-07-30)** — project
   `vertex` (`amnzbzwppazcqkwuuzhy`, org `lcfvtejnnemljeospcit`, region
   `eu-central-1`). `supabase link` + `supabase db push` applied
   `0001_init.sql` and `0002_search_and_views.sql`. All 4 Edge Functions
   deployed (`wallet-auth`, `link-social`, `sync-chain-state`,
   `relay-notification`). Secrets set: `GENLAYER_CONTRACT_ADDRESS`,
   `GENLAYER_RPC_URL`, `GENLAYER_CHAIN=studionet`, `WALLET_EMAIL_DOMAIN`,
   `INTERNAL_FUNCTION_SECRET` (randomly generated, lives only in Supabase's
   secret store). `scripts/setup_cron.sql` run against the linked DB —
   `vertex-sync-chain-state` cron job confirmed `active: true` on schedule
   `* * * * *` (verified via `select * from cron.job`).
3. ✅ **OAuth apps registered (2026-07-30)** — GitHub OAuth App
   (client ID `Ov23liGSdcx2Ky4Vj71G`) and an X (Twitter) Developer App using
   **OAuth 2.0** (not the deprecated Consumer Key/Secret OAuth 1.0a flow —
   the X portal shows both; OAuth 2.0 Client ID/Secret is under "User
   authentication settings", not "Keys and Tokens"). Both configured as
   enabled providers in Supabase Dashboard → Authentication → Sign In /
   Providers, callback URL
   `https://amnzbzwppazcqkwuuzhy.supabase.co/auth/v1/callback` for both.
   "Allow manual linking" also enabled (required for `linkIdentity()` per
   `backend/README.md`). Client secrets live only in the Supabase dashboard —
   not stored in any repo file. Note: also consider the native "Web3 Wallet"
   provider now visible there — see the "Needs verification" note above
   before committing to the current wallet-auth workaround.
4. ✅ **WalletConnect Cloud project ID obtained** —
   `91f607a2a48b565af91c4bb577d4bd53`, already set in `frontend/.env.local`.
5. ✅ **`.env.local` fully filled in** — `frontend/.env.local` has Supabase
   URL + anon key + contract address + RPC + WalletConnect project ID
   (gitignored — recreate after cloning). Backend secrets are set directly
   in Supabase (see step 2), not in a local file. GitHub/X OAuth
   client ID/secret live only in the Supabase dashboard's provider config
   (step 3), not in any env file.
6. ✅ **Frontend build + render verified (2026-07-30)** — `npm install` +
   `npm run build` passes cleanly (26/26 static pages; the "Module not
   found" lines for `@react-native-async-storage/async-storage` and
   `pino-pretty` are expected optional-dependency warnings from
   RainbowKit/WalletConnect, not build failures). `npm run dev` verified in
   browser against the real env vars above: landing page renders with the
   "GenLayer StudioNet" badge and Connect Wallet button, `/bounties` (Bounty
   Explorer) renders correctly, no console or server errors.
7. ✅ **Deployed (2026-07-30/31)** — `vercel link` created project
   `lolaas-projects/frontend`; all 5 `NEXT_PUBLIC_*` env vars set for the
   Production environment (Preview/Development left unset — add later if
   PR-preview deploys are wanted); `vercel --prod` succeeded (26/26 pages,
   same expected optional-dependency warnings as local). **Live at
   https://frontend-tau-smoky-34.vercel.app** — verified in-browser,
   landing page renders correctly, zero console errors. The backend needed
   no separate deploy step — Supabase Edge Functions + Cron are the entire
   "backend," which is what makes it structurally impossible for it to go
   down (no server process to crash).

**All 7 NEXT_STEPS are now complete.** Remaining open items are the
"Needs verification" and deferred items noted above (native Web3 Wallet
auth migration, `genlayer-chain` studionet preset check, wiring frontend
mock data to real Supabase data).

## ALL REQUIRED KEYS / SECRETS (every one is currently a placeholder)

| Key | Used by | Where to get it |
|---|---|---|
| `GENLAYER_CONTRACT_ADDRESS` / `NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS` | Backend + Frontend | Output of deploying `vertex_bounty_fusion.py` on StudioNet |
| `GENLAYER_RPC_URL` / `NEXT_PUBLIC_GENLAYER_RPC_URL` | Backend + Frontend | GenLayer StudioNet RPC endpoint (docs.genlayer.com) |
| `GENLAYER_CHAIN` | Backend | `genlayer-js` chain export name — **unverified, flagged in backend build**, double-check current `genlayer-js` docs |
| `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` | Backend + Frontend | New Supabase project settings |
| `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Backend + Frontend | New Supabase project settings |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend (Edge Functions) only | New Supabase project settings — never expose to frontend |
| `SUPABASE_PROJECT_REF` | Supabase CLI (`supabase link`) | New Supabase project settings |
| `SUPABASE_DB_PASSWORD` | Supabase CLI (migrations) | Set when creating the Supabase project |
| `SUPABASE_JWT_SECRET` | Backend, if custom JWT verification needed | New Supabase project settings |
| `GITHUB_OAUTH_CLIENT_ID` / `GITHUB_OAUTH_CLIENT_SECRET` | Supabase Auth provider config | Register a GitHub OAuth App |
| `TWITTER_OAUTH_CLIENT_ID` / `TWITTER_OAUTH_CLIENT_SECRET` | Supabase Auth provider config | Register an X/Twitter Developer App |
| `INTERNAL_FUNCTION_SECRET` | Shared secret between `sync-chain-state` and `relay-notification` | Generate any random secret |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Frontend wallet connection | cloud.walletconnect.com (free) |
| Vercel project env vars | Frontend deploy | Mirror every `NEXT_PUBLIC_*` key above in Vercel project settings |

No Fly.io deployment is needed — the "24/7 never dies" backend requirement is
met structurally by using serverless Supabase Edge Functions + Cron instead of
a standalone process.

## What this is

**Vertex** ("Merge competing solutions instead of choosing a single winner.")
A bounty marketplace where a GenLayer Intelligent Contract evaluates ALL
submissions to a bounty (not just picking one winner), builds a **Contribution
Graph** of how each contributor influenced the merged solution, and pays out
GEN token rewards proportionally — e.g. Security 30%, UI 20%, Performance 25%,
Recovery 15%, Docs 10%.

## Locked-in architecture decisions (2026-07-29)

| Area | Decision | Why |
|---|---|---|
| Database | Supabase (Postgres + Auth + Storage) | Relational fit for contribution graph/reward ledger; fast to ship |
| Backend compute | Supabase Edge Functions + Supabase Cron | No standing server process = literally cannot "die"; satisfies 24/7 requirement by having no server to crash |
| Auth | Wallet login only (MetaMask, Rainbow, Zerion, WalletConnect) via SIWE-style signature verification | User explicitly rejected custodial email+password wallets |
| Social identity | GitHub + X (Twitter) linked via OAuth **connection**, not typed usernames | Prevents impersonation — user was explicit about this |
| Frontend | Next.js on Vercel | Required deploy target |
| Contract platform | GenLayer Intelligent Contract, StudioNet, ONE contract | Per genlayer requirements — single well-designed IC preferred over many |
| Escrow currency | Native GEN via `gl.message.value` / `_send_gen` emission choke point | Real value-transfer path required, not fake numbers |
| Consensus | 5 validators, comparative (non-strict) equivalence via `gl.eq_principle.prompt_comparative` | Avoids leader rotation / Undetermined status while still requiring real agreement |
| Scope | Multi-bounty marketplace (any sponsor can create/fund a bounty) | User confirmed marketplace over single flagship bounty |
| Evaluation trigger | Sponsor manually closes submissions + triggers evaluation | Explicit human action starts the non-deterministic LLM reasoning call |
| Contract deployment | Project owner deploys production instances; a test deploy for verification purposes was explicitly authorized and performed once (see HANDOFF STATUS) | User-directed exception to the default "don't deploy on someone's behalf" rule, specifically for testing |

## Reference material used

- `/Users/macbook/Downloads/vertex-frontend.html` — visual/motion design prototype ONLY (colors, type, glass cards, graph animation). Rebuilt as real Next.js components, not copied.
- `/Users/macbook/Downloads/vertex.md` — the governing spec/roleplay brief for how this project must be built (phases, questions-first, Python file-op scripts for macOS terminal workflow, no Docker unless chosen).
- `/Users/macbook/Documents/builder-resources.md` — canonical GenLayer agent workflow: use `write-contract`/`genvm-lint`/`direct-tests`/`integration-tests`/`genlayer-cli` skills, pinned `Depends` header, `gl.eq_principle.prompt_comparative` for non-deterministic logic, TreeMap/DynArray/dataclass storage only (no raw dict/list), deterministic error prefixes (EXPECTED/EXTERNAL/TRANSIENT/LLM_ERROR).
- `/Users/macbook/Event-Weaver/contracts/event_weaver.py` — a working, tested GenLayer Intelligent Contract from a prior project (EventWeaver prediction markets). This is the **structural template** for Vertex's contract: the `_send_gen`/`_Recipient` EVM interface stub, zero-then-persist-then-transfer payout ordering, `gl.nondet.web.render` + `gl.nondet.exec_prompt` + `gl.eq_principle.prompt_comparative` pattern for trustless web-evidence adjudication, internal `balances: TreeMap[Address, u256]` withdrawable-credit pattern, and view/write separation.

## Review team's rejection criteria (must actively avoid)

1. Don't ship many small/thin projects — one serious project.
2. Don't build a plain AI-advice app with GenLayer bolted on — validator consensus must resolve something that needs real judgment across REAL evidence, not just "better AI answers."
3. Don't copy/lightly-modify an already-rewarded project — Vertex must be a genuinely new design (EventWeaver is a *pattern* reference, not a project to rename).
4. Validators must not just check output format (e.g. "is it valid JSON") — the contract must verify actual outcomes (here: comparing verdict substance via `prompt_comparative`, and contract-side web fetching of submission evidence).
5. Don't resolve based on user-submitted text alone — the contract fetches real evidence (repo URLs, docs, live web) via `gl.nondet.web.render` rather than trusting sponsor/submitter claims.
6. Full source must be submitted alongside any live link — keep this repo complete and pushed.

## Open items / not yet decided

- Exact reward-graph LLM prompt design (percentages per contribution category) — to be finalized when writing `intelligent-contract/contracts/vertex_bounty_fusion.py`.
- Whether GitHub/X OAuth linking uses Supabase's built-in OAuth providers directly or a custom Edge Function flow — needs verification against current Supabase Auth docs when implementing.
- Contract address: **resolved** — owner-controlled deployment
  `0xd942430229dD389fabeA73699Ffd9b09549b51D5`, verified working (see
  HANDOFF STATUS above). This is the authoritative address going forward;
  the earlier `0x612Dc...` address was a test deployment only.

## Working conventions

- User works via macOS Terminal, does not hand-edit files — file changes should be deliverable as idempotent Python scripts where the user requested that pattern, but for this build we are using the Write/Edit tools directly since we're operating in an interactive coding session (adjust if the user asks for standalone scripts again).
- Never invent GenLayer APIs — verify against `https://docs.genlayer.com/`, `https://skills.genlayer.com/`, and the SDK reference before use.
- Fly/Vercel CLIs are already installed on this machine.
