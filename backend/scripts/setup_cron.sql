-- setup_cron.sql — schedule sync-chain-state via pg_cron + pg_net
-- Verified pattern: https://supabase.com/docs/guides/functions/schedule-functions
--                   https://supabase.com/docs/guides/cron
-- Run this once against your linked project (via `supabase db push` won't run raw admin SQL
-- like this reliably across cron config — run it directly in the SQL Editor or `psql`/
-- `supabase db execute` after functions are deployed, since it references live secrets).

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Store the project URL and an API key in Vault rather than inlining them below, per the
-- Supabase-documented pattern (keeps secrets out of cron.job source and pg_stat statements).
-- Replace the placeholder values before running, or set them via the Supabase dashboard's
-- Vault UI (Project Settings -> Vault) and skip these two calls.
select vault.create_secret('https://YOUR_PROJECT_REF.supabase.co', 'project_url');
select vault.create_secret('YOUR_SUPABASE_SERVICE_ROLE_KEY', 'service_role_key');
-- NOTE: use the service_role key (not anon) here since sync-chain-state writes to tables that
-- have no client-facing insert/update policies (bounties/submissions/contribution_graph_entries
-- are service_role-only writers per 0001_init.sql).

-- Unschedule a prior run of this job if this script is re-run (idempotent setup).
select cron.unschedule('vertex-sync-chain-state')
where exists (select 1 from cron.job where jobname = 'vertex-sync-chain-state');

-- Every 1 minute (adjust to '*/2 * * * *' for every 2 minutes if 1-minute cadence is too chatty
-- against the GenLayer RPC / StudioNet rate limits).
select cron.schedule(
  'vertex-sync-chain-state',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
      || '/functions/v1/sync-chain-state',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- Verify scheduling:
--   select * from cron.job where jobname = 'vertex-sync-chain-state';
-- Inspect recent run results:
--   select * from cron.job_run_details order by start_time desc limit 20;
-- Inspect the raw HTTP responses pg_net recorded:
--   select * from net._http_response order by created desc limit 20;

-- To remove the schedule entirely:
--   select cron.unschedule('vertex-sync-chain-state');
