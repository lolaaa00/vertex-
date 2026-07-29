-- Vertex — full-text search + analytics/profile views
-- Verified Supabase / Postgres API references:
--   - tsvector generated columns + GIN index: standard Postgres FTS, documented at
--     https://supabase.com/docs/guides/database/full-text-search
--   - Materialized views + REFRESH MATERIALIZED VIEW: standard Postgres, Supabase notes on
--     usage: https://supabase.com/docs/guides/database/tables#materialized-views

-- ---------------------------------------------------------------------------
-- Full-text search over bounties (title + description + category)
-- ---------------------------------------------------------------------------
alter table public.bounties
  add column if not exists search_vector tsvector
  generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'C')
  ) stored;

create index if not exists idx_bounties_search_vector
  on public.bounties using gin (search_vector);

-- Convenience RPC for the frontend search page: `select * from search_bounties('zk proofs')`
create or replace function public.search_bounties(query text)
returns setof public.bounties
language sql
stable
as $$
  select *
  from public.bounties
  where search_vector @@ websearch_to_tsquery('english', query)
  order by ts_rank(search_vector, websearch_to_tsquery('english', query)) desc;
$$;

-- ---------------------------------------------------------------------------
-- Platform analytics (materialized — refreshed by sync-chain-state after each run)
-- ---------------------------------------------------------------------------
create materialized view if not exists public.platform_analytics as
select
  (select count(*) from public.bounties) as total_bounties,
  (select count(*) from public.bounties where status = 'settled') as total_bounties_settled,
  (select coalesce(sum(reward_owed_gen), 0) from public.contribution_graph_entries
     where tx_hash_settled is not null) as total_gen_distributed,
  (select count(distinct contributor_wallet) from public.contribution_graph_entries) as total_contributors,
  (select count(*) from public.submissions) as total_submissions,
  now() as refreshed_at;

-- Materialized views have no RLS of their own; grant read to anon/authenticated explicitly
-- and rely on the view only ever exposing aggregate counts (no per-user PII).
grant select on public.platform_analytics to anon, authenticated;

create materialized view if not exists public.submissions_per_category as
select b.category, count(s.id) as submission_count
from public.bounties b
left join public.submissions s on s.bounty_id = b.id
group by b.category
order by submission_count desc;

grant select on public.submissions_per_category to anon, authenticated;

-- Helper to refresh both; called at the end of each sync-chain-state run.
create or replace function public.refresh_platform_analytics()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view public.platform_analytics;
  refresh materialized view public.submissions_per_category;
end;
$$;

-- ---------------------------------------------------------------------------
-- Per-user profile aggregation view
-- ---------------------------------------------------------------------------
create or replace view public.profile_aggregates as
select
  p.id as user_id,
  p.wallet_address,
  p.display_name,
  p.avatar_url,
  (select count(*) from public.bounties b where b.sponsor_wallet = p.wallet_address) as bounties_sponsored,
  (select count(*) from public.submissions s where s.contributor_wallet = p.wallet_address) as submissions_made,
  (select coalesce(sum(cge.reward_owed_gen), 0)
     from public.contribution_graph_entries cge
     where cge.contributor_wallet = p.wallet_address
       and cge.tx_hash_settled is not null) as total_gen_earned
from public.profiles p;

grant select on public.profile_aggregates to anon, authenticated;
-- Plain view (not materialized) so it stays live; it only aggregates already-public data
-- (bounties/submissions/contribution_graph_entries are all publicly readable per 0001_init.sql),
-- so no RLS bypass concern even though views run with the querying role's privileges here.
