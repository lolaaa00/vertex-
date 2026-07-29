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
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
