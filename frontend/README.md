# Vertex — Frontend

Next.js 14 (App Router) + TypeScript + Tailwind CSS frontend for **Vertex**, a
bounty marketplace where a GenLayer Intelligent Contract evaluates every
submission to a bounty, builds a Contribution Graph, and distributes GEN
rewards proportionally. See `/MEMORY.md` at the repo root for full
architecture context.

## Stack

- **Framework**: Next.js 14 App Router, TypeScript, Tailwind CSS
- **Wallet**: `wagmi` + `@rainbow-me/rainbowkit` (MetaMask, Rainbow, Zerion,
  WalletConnect, and others out of the box via RainbowKit's default wallet
  list)
- **Backend client**: `@supabase/supabase-js` (Postgres + Auth + Storage +
  Edge Functions live in `../backend`)
- **Contract client**: `genlayer-js` targeting GenLayer StudioNet
- **Charts**: `recharts`

## Local development

```bash
cd frontend
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev
```

Open http://localhost:3000.

### Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project settings → API |
| `NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS` | A verified working test deployment exists: `0x612Dc3dA6d40cAF105185A07DC398D0f14A46e3e` (see `intelligent-contract/README.md`). Decide with whoever owns this project whether to keep using it or deploy a fresh owner-controlled instance before real use. |
| `NEXT_PUBLIC_GENLAYER_RPC_URL` | GenLayer StudioNet RPC endpoint: `https://studio.genlayer.com/api` |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Free project ID from https://cloud.reown.com |

The app builds and runs with these unset — it will log warnings and render
`TODO: wire to <service>` placeholder states rather than fabricating data.

## Scripts

```bash
npm run dev      # local dev server
npm run build    # production build
npm run start    # run the production build locally
npm run lint     # ESLint (next/core-web-vitals)
```

## Deploying to Vercel

The Vercel CLI is assumed to already be installed (`vercel --version`).

```bash
cd frontend
vercel link              # first time only, links this folder to a Vercel project
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS production
vercel env add NEXT_PUBLIC_GENLAYER_RPC_URL production
vercel env add NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID production
vercel --prod
```

Repeat `vercel env add ... preview` / `... development` if you want the same
vars available in preview deployments.

## Route map

All routes below were visually verified running (`npm run dev`) on
2026-07-29 — every page renders the full design system (gradient mesh,
glass cards, mono badges), not just the landing page.

| Route | Purpose |
|---|---|
| `/` | Landing page |
| `/bounties` | Bounty Explorer (search/filter) |
| `/bounties/[id]` | Bounty detail, submissions grid, submission form, sponsor controls |
| `/bounties/[id]/graph` | Contribution Graph, reward distribution, settlement tx strip |
| `/dashboard` | User's sponsored bounties, submissions, rewards, notifications |
| `/admin` | Platform-wide stats + owner-only moderation controls (UI only) |
| `/wallet` | Connect/disconnect, balance, transaction history |
| `/auth` | Wallet-connect-first SIWE-style sign-in + GitHub/X linking |
| `/settings` | Profile, linked socials, notification preferences |
| `/search` | Global search across bounties and contributors |
| `/analytics` | Platform charts (bounties over time, GEN by category) |
| `/profile/[wallet]` | Public contributor profile |

## Known TODOs (explicitly marked in source)

- `lib/supabase.ts` — client is wired but points at placeholder env vars
  until a real Supabase project exists (see repo-root `MEMORY.md`).
- `lib/genlayer.ts` — **fixed 2026-07-29**: `genlayer-js@0.3.4` has no
  `studionet` export in `genlayer-js/chains` (only `simulator`); this file
  now defines StudioNet manually via `viem`'s `defineChain` using the real
  chain ID (61999) and RPC (`https://studio.genlayer.com/api`), the same way
  `genlayer-js` defines `simulator` internally. `npm run build` passes
  cleanly with this fix.
- `lib/wallet.ts` — wagmi chains list uses `mainnet`/`sepolia` as
  placeholders pending GenLayer StudioNet's chain config.
- All mock data lives in `lib/mockData.ts` — every page that reads it has an
  inline `// TODO: wire to <service>` comment marking where live data should
  replace it.
- `/auth` — SIWE message is a static client-built string; production should
  fetch a server-issued nonce/message from a Supabase Edge Function.
- `/admin` moderation buttons log locally only; no contract calls are wired.
