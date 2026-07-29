# Vertex — Project Memory

Persistent context for anyone (human or agent) picking this project up later.
Update this file whenever a decision, blocker, or non-obvious fact changes.

**This project was built by one person for another person to continue.** Every
credential below is an unfilled placeholder — nothing is wired to a real
account, key, or deployed address yet. Whoever clones this repo next should
read the "HANDOFF STATUS" section first, then follow "NEXT STEPS" in order.

## HANDOFF STATUS (read this first)

### ✅ Done
- **Repo scaffold** — folder structure, `.gitignore`, this memory file.
- **Intelligent Contract** (`intelligent-contract/contracts/vertex_bounty_fusion.py`, ~1306 lines):
  written, lint-clean (`genvm-lint` passed, 0 errors, 1 informational-only warning),
  34/34 direct unit tests passing. Full bounty lifecycle: create → submit →
  close submissions → evaluate (5-validator comparative equivalence,
  Contribution Graph reasoning over real fetched web evidence) → settle GEN
  payouts, plus cancellation and sponsor-timeout recovery paths. **Not yet
  deployed** — see NEXT STEPS.
- **Backend** (`backend/supabase/`): Postgres schema + RLS policies, wallet
  signature auth (SIWE-style, no custodial keys), GitHub/X OAuth account
  **linking** (not login), Edge Functions for chain-state sync (`sync-chain-state`)
  and notifications (`relay-notification`), Cron setup script. **Not yet
  connected to a real Supabase project** — see NEXT STEPS.
- **Frontend** (`frontend/`): Next.js App Router + TypeScript + Tailwind, all
  required pages scaffolded (landing, bounty explorer, bounty detail,
  contribution graph visualization, dashboard, admin, wallet, auth, settings,
  search, analytics, profile, error/empty/loading states), custom Vertex
  logo/favicon (`frontend/app/icon.svg`), wallet connection wiring
  (MetaMask/Rainbow/Zerion/WalletConnect). `npm install` completed
  (`node_modules` exists locally but is gitignored — re-run `npm install`
  after cloning). **Build/route completeness not yet independently
  re-verified after the agent's own report** — run `npm run build` after
  cloning and fix anything that surfaces.

### ⏳ In progress / needs verification
- Confirm the frontend actually builds cleanly end-to-end (`cd frontend && npm install && npm run build`).
- Two flagged-as-uncertain items from the backend build (see "Open items" below):
  the exact `genlayer-js` StudioNet chain-export name, and whether Supabase
  has since added a native wallet-auth provider (the current implementation
  uses a `generateLink` + `verifyOtp` workaround — re-check
  `docs.supabase.com/guides/auth` before relying on it in production).

### ❌ Not started / explicitly deferred
- **Contract deployment** — must be done by the project owner via GenLayer
  Studio or `genlayer` CLI, not by an assistant. See NEXT STEPS.
- **Supabase project creation** — no project exists yet; schema/functions are
  written but not pushed anywhere.
- **OAuth app registration** — no GitHub OAuth App or X (Twitter) Developer
  App has been created; both are prerequisites for social linking to work.
- **WalletConnect Cloud project** — no project ID has been generated yet.
- **Vercel/production deployment** — nothing has been deployed; Vercel CLI is
  installed locally but no `vercel` project has been linked.
- Wiring the frontend to real Supabase/contract data (currently mock data
  with explicit `// TODO: wire to <service>` comments throughout).

## NEXT STEPS (in order, for whoever continues this)

1. **Deploy the Intelligent Contract** on GenLayer Studio → StudioNet, using
   `intelligent-contract/contracts/vertex_bounty_fusion.py`. Constructor args:
   `min_bond_default` (0 is fine for testnet), `timeout_grace_seconds` (3600
   for fast testing, or something like 259200–604800 for realistic timing).
   Copy the resulting contract address into `GENLAYER_CONTRACT_ADDRESS` /
   `NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS`.
2. **Create a Supabase project**, run `supabase link` + `supabase db push`
   against `backend/supabase/migrations/`, deploy the Edge Functions in
   `backend/supabase/functions/`, and set the secrets listed below.
3. **Register OAuth apps** (GitHub OAuth App, X/Twitter Developer App) and
   configure them as providers in the Supabase Auth dashboard.
4. **Get a WalletConnect Cloud project ID** at cloud.walletconnect.com.
5. **Fill in `.env.example` → real `.env`/`.env.local` files** (root, backend,
   frontend) with everything from the "ALL REQUIRED KEYS" table below.
6. **Re-run and fix the frontend build**, verify pages actually render against
   real (or at least locally-running Supabase) data.
7. **Deploy**: `vercel --prod` for the frontend (Vercel CLI already installed).
   The backend needs no separate deploy step — Supabase Edge Functions +
   Cron are the entire "backend," which is what makes it structurally
   impossible for it to go down (no server process to crash).

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
| Contract deployment | **User deploys manually and provides the contract address** — Claude does NOT deploy | Explicit instruction; do not attempt CLI deploy on user's behalf |

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
- Contract address: **pending — user will deploy via `genlayer-cli` on StudioNet and provide the address.** Do not hardcode until given.

## Working conventions

- User works via macOS Terminal, does not hand-edit files — file changes should be deliverable as idempotent Python scripts where the user requested that pattern, but for this build we are using the Write/Edit tools directly since we're operating in an interactive coding session (adjust if the user asks for standalone scripts again).
- Never invent GenLayer APIs — verify against `https://docs.genlayer.com/`, `https://skills.genlayer.com/`, and the SDK reference before use.
- Fly/Vercel CLIs are already installed on this machine.
