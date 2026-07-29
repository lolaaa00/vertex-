// sync-chain-state — pulls GenLayer Intelligent Contract state and mirrors it into Postgres.
//
// Verified API references:
//   - genlayer-js client creation / readContract signature:
//     https://docs.genlayer.com/api-references/genlayer-js
//     `createClient({ chain })` then `client.readContract({ address, functionName, args })`.
//     Chain presets (`localnet`, `testnet`, `studionet`/`simulator`) come from `genlayer-js/chains`
//     — verify the exact exported chain name against the docs above at deploy time, since the
//     contract targets GenLayer StudioNet per MEMORY.md. This function reads the chain name from
//     `GENLAYER_CHAIN` env (default "studionet") rather than hardcoding, since the exact preset
//     export name should be re-checked against genlayer-js's current chains module before first
//     deploy — FLAGGED, see backend/README.md.
//   - Supabase upsert-on-conflict: https://supabase.com/docs/reference/javascript/upsert
//
// Contract function names (get_bounties / get_submissions / get_contribution_graph) are
// PLACEHOLDERS — the actual view function names depend on vertex_bounty_fusion.py, which per
// MEMORY.md is not finalized/deployed yet. They are isolated into the `readContractState()`
// helper below so wiring them up later is a one-function edit driven by the real ABI/state
// once `intelligent-contract/contracts/vertex_bounty_fusion.py` is written and deployed.
//
// This function is idempotent: every upsert keys off chain_bounty_id / chain_submission_id /
// (bounty_id, contributor_wallet, category), so re-running it on a schedule never duplicates rows.
// If GENLAYER_CONTRACT_ADDRESS is unset (contract not deployed yet), it logs and no-ops cleanly.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient as createSupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createClient as createGenlayerClient } from "https://esm.sh/genlayer-js@0.9.1";
import * as genlayerChains from "https://esm.sh/genlayer-js@0.9.1/chains";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CONTRACT_ADDRESS = Deno.env.get("GENLAYER_CONTRACT_ADDRESS");
const GENLAYER_CHAIN_NAME = Deno.env.get("GENLAYER_CHAIN") ?? "studionet";
const GENLAYER_RPC_URL = Deno.env.get("GENLAYER_RPC_URL");

const db = createSupabaseClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

interface ChainBounty {
  chain_bounty_id: number;
  sponsor: string;
  title: string;
  description: string;
  category: string;
  reward_pool_gen: string;
  status: string;
  submission_deadline: string | null;
  evaluation_criteria: unknown;
  tx_hash: string | null;
}

interface ChainSubmission {
  chain_submission_id: number;
  chain_bounty_id: number;
  contributor: string;
  evidence_url: string | null;
  summary: string;
  submitted_at: string;
  tx_hash: string | null;
}

interface ChainGraphEntry {
  chain_bounty_id: number;
  contributor: string;
  category: string;
  influence_weight_bps: number;
  reward_owed_gen: string;
  reasoning_excerpt: string | null;
  tx_hash_settled: string | null;
  settled: boolean;
}

interface ChainState {
  bounties: ChainBounty[];
  submissions: ChainSubmission[];
  graphEntries: ChainGraphEntry[];
}

async function readContractState(): Promise<ChainState> {
  const chainPreset = (genlayerChains as Record<string, unknown>)[GENLAYER_CHAIN_NAME];
  if (!chainPreset) {
    throw new Error(
      `genlayer-js has no exported chain preset named "${GENLAYER_CHAIN_NAME}" — verify against ` +
        `https://docs.genlayer.com/api-references/genlayer-js before relying on this.`,
    );
  }

  const client = createGenlayerClient({
    chain: chainPreset,
    ...(GENLAYER_RPC_URL ? { endpoint: GENLAYER_RPC_URL } : {}),
  });

  // NOTE: function names below are placeholders pending the finalized contract ABI.
  const [bounties, submissions, graphEntries] = await Promise.all([
    client.readContract({ address: CONTRACT_ADDRESS!, functionName: "get_bounties", args: [] }),
    client.readContract({ address: CONTRACT_ADDRESS!, functionName: "get_submissions", args: [] }),
    client.readContract({
      address: CONTRACT_ADDRESS!,
      functionName: "get_contribution_graph",
      args: [],
    }),
  ]) as [ChainBounty[], ChainSubmission[], ChainGraphEntry[]];

  return { bounties, submissions, graphEntries };
}

async function upsertBounties(bounties: ChainBounty[]): Promise<Map<number, string>> {
  const idMap = new Map<number, string>();
  for (const b of bounties) {
    const { data, error } = await db
      .from("bounties")
      .upsert(
        {
          chain_bounty_id: b.chain_bounty_id,
          sponsor_wallet: b.sponsor.toLowerCase(),
          title: b.title,
          description: b.description,
          category: b.category,
          reward_pool_gen: b.reward_pool_gen,
          status: b.status,
          submission_deadline: b.submission_deadline,
          evaluation_criteria: b.evaluation_criteria ?? [],
          tx_hash_created: b.tx_hash,
        },
        { onConflict: "chain_bounty_id" },
      )
      .select("id, chain_bounty_id")
      .single();
    if (error) {
      console.error("upsert bounty failed", b.chain_bounty_id, error.message);
      continue;
    }
    idMap.set(b.chain_bounty_id, data.id);
  }
  return idMap;
}

async function upsertSubmissions(submissions: ChainSubmission[], bountyIdMap: Map<number, string>) {
  for (const s of submissions) {
    const bountyId = bountyIdMap.get(s.chain_bounty_id);
    if (!bountyId) {
      console.warn("skipping submission for unknown bounty", s.chain_bounty_id);
      continue;
    }
    const { error } = await db.from("submissions").upsert(
      {
        chain_submission_id: s.chain_submission_id,
        bounty_id: bountyId,
        contributor_wallet: s.contributor.toLowerCase(),
        evidence_url: s.evidence_url,
        summary: s.summary,
        submitted_at: s.submitted_at,
        tx_hash: s.tx_hash,
      },
      { onConflict: "chain_submission_id" },
    );
    if (error) console.error("upsert submission failed", s.chain_submission_id, error.message);
  }
}

// Returns the bounty_id/contributor pairs that just transitioned to settled, so the caller can
// fan out notifications for them.
async function upsertGraphEntries(
  entries: ChainGraphEntry[],
  bountyIdMap: Map<number, string>,
): Promise<Array<{ bounty_id: string; contributor_wallet: string; reward_owed_gen: string }>> {
  const newlySettled: Array<{ bounty_id: string; contributor_wallet: string; reward_owed_gen: string }> = [];

  for (const g of entries) {
    const bountyId = bountyIdMap.get(g.chain_bounty_id);
    if (!bountyId) continue;

    const { data: existing } = await db
      .from("contribution_graph_entries")
      .select("id, tx_hash_settled")
      .eq("bounty_id", bountyId)
      .eq("contributor_wallet", g.contributor.toLowerCase())
      .eq("category", g.category)
      .maybeSingle();

    const wasUnsettled = !existing?.tx_hash_settled;

    const { error } = await db.from("contribution_graph_entries").upsert(
      {
        bounty_id: bountyId,
        contributor_wallet: g.contributor.toLowerCase(),
        category: g.category,
        influence_weight_bps: g.influence_weight_bps,
        reward_owed_gen: g.reward_owed_gen,
        reasoning_excerpt: g.reasoning_excerpt,
        tx_hash_settled: g.tx_hash_settled,
      },
      { onConflict: "bounty_id,contributor_wallet,category" },
    );
    if (error) {
      console.error("upsert contribution_graph_entries failed", g.chain_bounty_id, g.contributor, error.message);
      continue;
    }

    if (wasUnsettled && g.tx_hash_settled) {
      newlySettled.push({
        bounty_id: bountyId,
        contributor_wallet: g.contributor.toLowerCase(),
        reward_owed_gen: g.reward_owed_gen,
      });
    }
  }

  return newlySettled;
}

async function notifyNewlySettled(
  settled: Array<{ bounty_id: string; contributor_wallet: string; reward_owed_gen: string }>,
) {
  if (settled.length === 0) return;
  const relayUrl = `${SUPABASE_URL}/functions/v1/relay-notification`;
  for (const s of settled) {
    try {
      await fetch(relayUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          bounty_id: s.bounty_id,
          contributor_wallet: s.contributor_wallet,
          reward_owed_gen: s.reward_owed_gen,
        }),
      });
    } catch (e) {
      console.error("failed to relay notification", e);
    }
  }
}

serve(async (_req) => {
  if (!CONTRACT_ADDRESS) {
    console.log("GENLAYER_CONTRACT_ADDRESS is not set — contract not deployed yet, no-op run.");
    return json({ status: "noop", reason: "GENLAYER_CONTRACT_ADDRESS unset" });
  }

  try {
    const state = await readContractState();
    const bountyIdMap = await upsertBounties(state.bounties);
    await upsertSubmissions(state.submissions, bountyIdMap);
    const newlySettled = await upsertGraphEntries(state.graphEntries, bountyIdMap);
    await notifyNewlySettled(newlySettled);

    const { error: refreshErr } = await db.rpc("refresh_platform_analytics");
    if (refreshErr) console.error("failed to refresh analytics views", refreshErr.message);

    return json({
      status: "ok",
      bounties: state.bounties.length,
      submissions: state.submissions.length,
      graph_entries: state.graphEntries.length,
      newly_settled: newlySettled.length,
    });
  } catch (e) {
    console.error("sync-chain-state failed", e);
    return json({ status: "error", detail: String(e) }, 500);
  }
});
