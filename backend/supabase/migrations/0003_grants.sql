-- Grant base table privileges matching the RLS policies from 0001_init.sql.
-- RLS policies alone are not sufficient — Postgres also requires the anon/
-- authenticated roles to hold the underlying GRANT before RLS is even
-- evaluated. This was missed in 0001_init.sql (only 0002_search_and_views.sql
-- granted the materialized views), which caused "permission denied for
-- table X" on every client read despite the "publicly readable" policies
-- being correct. Discovered 2026-08-01 while wiring the frontend to real
-- data. See https://supabase.com/docs/guides/database/postgres/row-level-security
-- ("RLS is enforced in addition to any privileges the role has").

grant select on public.bounties to anon, authenticated;
grant select on public.submissions to anon, authenticated;
grant select on public.contribution_graph_entries to anon, authenticated;
grant select on public.social_connections to anon, authenticated;

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;

-- notifications: no anon access (matches the "users can read their own
-- notifications" auth.uid()-gated policy — anon has no uid, so it would
-- never match anyway, but we don't grant it privileges it can't use).
grant select, update on public.notifications to authenticated;
