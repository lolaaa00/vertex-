# Vertex

**Merge competing solutions instead of choosing a single winner.**

A bounty marketplace where a GenLayer Intelligent Contract evaluates every
submission to a bounty together — never picking one winner — builds a
**Contribution Graph** of how each contributor influenced the merged
solution, and pays out GEN token rewards proportionally (e.g. Security 30%,
UI 20%, Performance 25%, Recovery 15%, Docs 10%).

**Start here → [`MEMORY.md`](./MEMORY.md)** — full handoff status, what's
done/verified, what's left, and every credential you'll need. This README is
just a map of the repo; `MEMORY.md` is the source of truth on project state.

**Why this idea, over what alternatives → [`DECISION_RECORD.md`](./DECISION_RECORD.md)**
— 10 candidates spanning web-fetch, native GEN value, image evidence, and
embeddings, gate-by-gate justification for Vertex, and an honest self-audit.

## Repo layout

```
vertex/
  intelligent-contract/   GenLayer Intelligent Contract (Python, GenVM)
    contracts/vertex_bounty_fusion.py   — the contract (~1306 lines)
    tests/direct/                       — fast in-memory unit tests
    tests/integration/                  — gltest consensus tests (need a live network)
    README.md                           — lint/test/deploy instructions + deployment status
  backend/                 Supabase (Postgres + Auth + Edge Functions + Cron)
    supabase/migrations/                — schema + RLS
    supabase/functions/                 — wallet-auth, link-social, sync-chain-state, relay-notification
    README.md                           — setup + secrets + auth model
  frontend/                Next.js 14 (App Router) + TypeScript + Tailwind
    app/                                — every required page (see frontend/README.md route map)
    lib/                                — supabase.ts, genlayer.ts, wallet.ts clients
    README.md                           — dev/build/deploy instructions
  MEMORY.md                Full project memory — read this first
```

## Current status (2026-07-29)

| Layer | Status |
|---|---|
| Intelligent Contract | ✅ Written, tested, **deployed and verified working** on GenLayer StudioNet (owner-controlled instance) |
| Frontend | ✅ All pages built, visually verified against real env vars, production build passes |
| Backend | ✅ Live Supabase project: schema pushed, Edge Functions deployed, cron active, GitHub + X OAuth enabled |
| Deployment | ✅ Live on Vercel: https://ver-tex.vercel.app |

See `MEMORY.md` → "HANDOFF STATUS" and "NEXT STEPS" for the exact remaining
checklist and every key/secret required.

## Quickstart (local dev)

```bash
# Frontend
cd frontend
npm install
npm run dev   # http://localhost:3000

# Contract — already deployed and verified; see intelligent-contract/README.md
# to redeploy your own instance or run the lint/test suite.

# Backend — see backend/README.md to stand up a Supabase project.
```

## Architecture in one paragraph

Vertex has three parts: a single **GenLayer Intelligent Contract** that holds
bounty funds in escrow (real native GEN, not a placeholder number), evaluates
all submissions together using validator consensus over real fetched web
evidence, and pays out proportionally; a **Supabase backend** (Postgres +
Auth + Edge Functions + Cron — no standalone server, so there's nothing to
crash, which is how the "must never go down" requirement is met structurally)
that mirrors on-chain state for fast reads and handles wallet-signature auth
plus GitHub/X account linking; and a **Next.js frontend** deployed to Vercel
that ties it together. Full rationale for every architectural decision is in
`MEMORY.md`.
