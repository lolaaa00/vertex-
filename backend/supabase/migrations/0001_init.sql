-- Vertex bounty marketplace — initial schema
-- Verified Supabase API references used in this migration and the functions that depend on it:
--   - RLS + policies pattern: https://supabase.com/docs/guides/database/postgres/row-level-security
--   - auth.uid() / service_role bypass: https://supabase.com/docs/guides/auth/row-level-security
--   - pgcrypto gen_random_uuid(): built-in Postgres extension, standard on Supabase projects
--
-- Design notes:
--   * Primary identity is the wallet address (lowercased hex), not an email. profiles.id is the
--     Supabase auth.users.id (uuid) created via the wallet-auth Edge Function using a synthetic
--     email `{address}@wallet.vertex.local` (see functions/wallet-auth/index.ts for why).
--   * On-chain tables (bounties, submissions, contribution_graph_entries) mirror GenLayer
--     Intelligent Contract state. On-chain is the source of truth; these rows are a fast-read
--     cache kept in sync by functions/sync-chain-state (service_role only writes).
--   * RLS: public read of marketplace data, users write only their own profile/notifications,
--     service_role (used by Edge Functions) bypasses RLS entirely by design (it always has
--     BYPASSRLS-equivalent access via the service key, per Supabase docs above).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  wallet_address text not null unique,
  display_name text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wallet_address_format check (wallet_address ~* '^0x[0-9a-f]{40}$')
);

create index if not exists idx_profiles_wallet_address on public.profiles (wallet_address);

alter table public.profiles enable row level security;

create policy "profiles are publicly readable"
  on public.profiles for select
  using (true);

create policy "users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "service role full access to profiles"
  on public.profiles for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- social_connections  (GitHub / X linking — proof-of-control, not free text)
-- ---------------------------------------------------------------------------
create type public.social_provider as enum ('github', 'x');

create table if not exists public.social_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider public.social_provider not null,
  provider_user_id text not null,
  provider_username text not null,
  linked_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists idx_social_connections_user on public.social_connections (user_id);
create index if not exists idx_social_connections_provider_lookup on public.social_connections (provider, provider_user_id);

alter table public.social_connections enable row level security;

create policy "social connections are publicly readable"
  on public.social_connections for select
  using (true);

create policy "service role full access to social_connections"
  on public.social_connections for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
-- NOTE: no direct client insert/update/delete policy — rows are written only by the
-- link-social Edge Function (service_role) after Supabase confirms the OAuth identity.

-- ---------------------------------------------------------------------------
-- bounties (mirrors on-chain state)
-- ---------------------------------------------------------------------------
create type public.bounty_status as enum (
  'open', 'submissions_closed', 'evaluating', 'settled', 'cancelled'
);

create table if not exists public.bounties (
  id uuid primary key default gen_random_uuid(),
  chain_bounty_id bigint unique, -- null until the on-chain create tx confirms and sync writes it
  sponsor_wallet text not null,
  title text not null,
  description text not null,
  category text not null,
  reward_pool_gen numeric(38, 18) not null check (reward_pool_gen >= 0),
  status public.bounty_status not null default 'open',
  submission_deadline timestamptz,
  evaluation_criteria jsonb not null default '[]'::jsonb,
  tx_hash_created text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsor_wallet_format check (sponsor_wallet ~* '^0x[0-9a-f]{40}$')
);

create index if not exists idx_bounties_status on public.bounties (status);
create index if not exists idx_bounties_sponsor on public.bounties (sponsor_wallet);
create index if not exists idx_bounties_category on public.bounties (category);
create index if not exists idx_bounties_chain_id on public.bounties (chain_bounty_id);

alter table public.bounties enable row level security;

create policy "bounties are publicly readable"
  on public.bounties for select
  using (true);

create policy "service role full access to bounties"
  on public.bounties for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
-- NOTE: bounties are created on-chain first; the sync-chain-state function (service_role)
-- is the only writer. No direct client insert policy — prevents spoofed marketplace listings.

-- ---------------------------------------------------------------------------
-- submissions (mirrors on-chain state)
-- ---------------------------------------------------------------------------
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  chain_submission_id bigint unique,
  bounty_id uuid not null references public.bounties(id) on delete cascade,
  contributor_wallet text not null,
  evidence_url text,
  summary text not null,
  submitted_at timestamptz not null default now(),
  tx_hash text,
  constraint contributor_wallet_format check (contributor_wallet ~* '^0x[0-9a-f]{40}$')
);

create index if not exists idx_submissions_bounty on public.submissions (bounty_id);
create index if not exists idx_submissions_contributor on public.submissions (contributor_wallet);
create index if not exists idx_submissions_chain_id on public.submissions (chain_submission_id);

alter table public.submissions enable row level security;

create policy "submissions are publicly readable"
  on public.submissions for select
  using (true);

create policy "service role full access to submissions"
  on public.submissions for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- contribution_graph_entries (mirrors on-chain reasoning trace + reward allocation)
-- ---------------------------------------------------------------------------
create table if not exists public.contribution_graph_entries (
  id uuid primary key default gen_random_uuid(),
  bounty_id uuid not null references public.bounties(id) on delete cascade,
  contributor_wallet text not null,
  category text not null,
  influence_weight_bps integer not null check (influence_weight_bps >= 0 and influence_weight_bps <= 10000),
  reward_owed_gen numeric(38, 18) not null default 0 check (reward_owed_gen >= 0),
  reasoning_excerpt text,
  tx_hash_settled text,
  created_at timestamptz not null default now(),
  constraint contributor_wallet_format check (contributor_wallet ~* '^0x[0-9a-f]{40}$'),
  unique (bounty_id, contributor_wallet, category)
);

create index if not exists idx_cge_bounty on public.contribution_graph_entries (bounty_id);
create index if not exists idx_cge_contributor on public.contribution_graph_entries (contributor_wallet);

alter table public.contribution_graph_entries enable row level security;

create policy "contribution graph entries are publicly readable"
  on public.contribution_graph_entries for select
  using (true);

create policy "service role full access to contribution_graph_entries"
  on public.contribution_graph_entries for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications (user_id);
create index if not exists idx_notifications_unread on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

create policy "users can read their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "users can mark their own notifications read"
  on public.notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "service role full access to notifications"
  on public.notifications for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
-- NOTE: no client insert policy — notifications are only created by relay-notification (service_role).

-- ---------------------------------------------------------------------------
-- wallet_auth_nonces (SIWE-style challenge/response bookkeeping)
-- ---------------------------------------------------------------------------
create table if not exists public.wallet_auth_nonces (
  id uuid primary key default gen_random_uuid(),
  address text not null,
  nonce text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint address_format check (address ~* '^0x[0-9a-f]{40}$')
);

create index if not exists idx_wallet_auth_nonces_address on public.wallet_auth_nonces (address);
create index if not exists idx_wallet_auth_nonces_expires on public.wallet_auth_nonces (expires_at);

alter table public.wallet_auth_nonces enable row level security;

-- No public policies at all: this table is only ever touched by the wallet-auth Edge
-- Function using the service_role key. Clients never read or write it directly.
create policy "service role full access to wallet_auth_nonces"
  on public.wallet_auth_nonces for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- updated_at maintenance trigger (profiles, bounties)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_bounties_updated_at on public.bounties;
create trigger trg_bounties_updated_at
  before update on public.bounties
  for each row execute function public.set_updated_at();
