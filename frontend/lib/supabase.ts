import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

if (!supabaseUrl || !supabaseAnonKey) {
  // Non-fatal: allows local dev / build without a live Supabase project yet.
  // TODO: wire to Supabase — set NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.
  // eslint-disable-next-line no-console
  console.warn(
    "[lib/supabase] Missing Supabase env vars — client will not be able to reach the project."
  );
}

// Single shared Supabase client for browser + client-component use.
// Backend business logic (bounty CRUD, submissions, reward ledger, OAuth
// linking) lives in Supabase Edge Functions per MEMORY.md — this client is
// the thin frontend entry point into that layer.
//
// `global.fetch` forces `cache: "no-store"` on every request. Next.js App
// Router's Data Cache can cache a library's own fetch() calls indefinitely
// (keyed by exact URL) even on a route marked `dynamic = "force-dynamic"` —
// that segment config reliably disables Next's *own* fetch wrapper caching,
// but doesn't reliably cascade into fetches issued by an imported library
// like supabase-js. Observed directly: a Server Component request for a
// bounty's submissions kept returning the empty result cached from before
// any submission existed, even minutes after a real submission was
// confirmed to exist via a direct REST call bypassing this client entirely.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
  },
});
