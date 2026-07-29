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
  - This deployed address is a **verified test deployment**. Decide with
    whoever owns this project whether to keep using it or deploy a fresh
    instance (so the deployer holds the `owner` role for `pause`/`set_owner`)
    before real/production use — either way, the contract code itself is
    proven working.
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
- Whether Supabase has since added a native wallet-auth provider — the
  current backend implementation uses a `generateLink` + `verifyOtp`
  workaround (documented as best-verified-available in
  `backend/README.md`). Re-check `docs.supabase.com/guides/auth` before
  relying on it in production.
- Whether `genlayer-js@0.9.1` (used only by the backend Edge Function)
  exports a `studionet` chain preset — see above.

### ❌ Not started / explicitly deferred — these are the real remaining steps
- **Supabase project creation** — no project exists yet; schema/functions
  are written but not pushed anywhere.
- **OAuth app registration** — no GitHub OAuth App or X (Twitter) Developer
  App has been created; both are prerequisites for social linking to work.
- **WalletConnect Cloud project** — no project ID has been generated yet.
- **Vercel/production deployment** — nothing has been deployed; Vercel CLI
  is installed locally but no `vercel` project has been linked.
- Wiring the frontend to real Supabase data (currently mock data with
  explicit `// TODO: wire to <service>` comments throughout — the contract
  data itself can be wired now since it's live, see NEXT STEPS).

## NEXT STEPS (in order, for whoever continues this)

1. **Decide on the contract address.** Either keep using the verified test
   deployment (`0x612Dc3dA6d40cAF105185A07DC398D0f14A46e3e`) or deploy your
   own fresh instance from `intelligent-contract/contracts/vertex_bounty_fusion.py`
   (constructor args: `min_bond_default=0`, `timeout_grace_seconds` — 3600
   for fast testing or 259200–604800 for realistic production timing). If
   the CLI reports `invalid_contract`, use the GenLayer Studio web UI
   instead (see `intelligent-contract/README.md`). Set
   `GENLAYER_CONTRACT_ADDRESS` / `NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS` to
   whichever address you land on.
2. **Create a Supabase project**, run `supabase link` + `supabase db push`
   against `backend/supabase/migrations/`, deploy the Edge Functions in
   `backend/supabase/functions/`, and set the secrets listed below.
3. **Register OAuth apps** (GitHub OAuth App, X/Twitter Developer App) and
   configure them as providers in the Supabase Auth dashboard.
4. **Get a WalletConnect Cloud project ID** at cloud.walletconnect.com.
5. **Fill in `.env.example` → real `.env`/`.env.local` files** (root, backend,
   frontend) with everything from the "ALL REQUIRED KEYS" table below.
   (`frontend/.env.local` already has the verified contract address +
   StudioNet RPC filled in locally — it's gitignored, so re-create it after
   cloning if you want the same local setup.)
6. **Re-run and fix the frontend build**, verify pages actually render
   against real (or at least locally-running Supabase) data.
7. **Deploy**: `vercel --prod` for the frontend (Vercel CLI already
   installed). The backend needs no separate deploy step — Supabase Edge
   Functions + Cron are the entire "backend," which is what makes it
   structurally impossible for it to go down (no server process to crash).

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
- Contract address: **resolved** — `0x612Dc3dA6d40cAF105185A07DC398D0f14A46e3e`, deployed via GenLayer Studio web UI and verified working. See HANDOFF STATUS above for whether to keep it or deploy fresh.

## Working conventions

- User works via macOS Terminal, does not hand-edit files — file changes should be deliverable as idempotent Python scripts where the user requested that pattern, but for this build we are using the Write/Edit tools directly since we're operating in an interactive coding session (adjust if the user asks for standalone scripts again).
- Never invent GenLayer APIs — verify against `https://docs.genlayer.com/`, `https://skills.genlayer.com/`, and the SDK reference before use.
- Fly/Vercel CLIs are already installed on this machine.
