-- Grant full table privileges to service_role. Same root cause as
-- 0003_grants.sql: service_role bypasses RLS but still needs the underlying
-- Postgres GRANT — that was missing for service_role on every table too,
-- which caused sync-chain-state (which authenticates as service_role) to
-- fail with "permission denied for table bounties" on every write, even
-- after 0003_grants.sql fixed anon/authenticated reads. Discovered
-- 2026-08-01 debugging why a successfully-created on-chain bounty never
-- appeared in the Supabase mirror.

grant all on public.bounties to service_role;
grant all on public.submissions to service_role;
grant all on public.contribution_graph_entries to service_role;
grant all on public.profiles to service_role;
grant all on public.social_connections to service_role;
grant all on public.notifications to service_role;
grant all on public.wallet_auth_nonces to service_role;
