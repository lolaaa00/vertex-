# Vertex — Project Memory

Persistent context for anyone (human or agent) picking this project up later.
Update this file whenever a decision, blocker, or non-obvious fact changes.

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
