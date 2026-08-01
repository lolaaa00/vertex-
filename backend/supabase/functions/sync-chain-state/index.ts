// sync-chain-state — pulls GenLayer Intelligent Contract state and mirrors it into Postgres.
//
// Verified against the real deployed ABI (intelligent-contract/contracts/vertex_bounty_fusion.py),
// re-checked 2026-08-01 after discovering this function's original field mapping was written
// against a guessed shape before the contract existed and never re-verified once it was deployed.
// Real shapes (see `_bounty_dict` / `_submission_dict` in the contract):
//   get_bounties(offset=0, limit=20, status="", category="") -> list[dict] with keys:
//     id, sponsor, title, description, category, reward_pool, reward_deposited, status
//     (name string e.g. "OPEN_FOR_SUBMISSIONS"), created_ts, submission_deadline_ts,
//     evaluation_criteria (comma-separated string, not an array), min_bond, settlement_ts,
//     submission_count. Amounts are wei-like integers (18 decimals), not GEN-denominated floats.
//   get_submissions(bounty_id) -> list[dict] with keys:
//     id (scoped per-bounty, NOT globally unique — see chainSubmissionId() below), bounty_id,
//     contributor, evidence_url, summary, submitted_ts, extracted_category (dominant category
//     assigned at evaluation time, "" until evaluated), influence_weight_bps (0 until evaluated),
//     reward_owed (0 until evaluated), paid.
// There is no separate "get_contribution_graph" flat list — contribution-graph data (category /
// influence_weight_bps / reward_owed) lives directly on each Submission once evaluated, so this
// function derives contribution_graph_entries rows from submissions with influence_weight_bps > 0
// rather than a nonexistent third contract call.
//
// genlayer-js chain preset: reads `GENLAYER_CHAIN` (default "studionet") from
// `https://esm.sh/genlayer-js@1.1.8/chains` — pinned to 1.1.8 to match the frontend
// (frontend/lib/genlayer.ts) since older 0.x versions of genlayer-js had no `studionet` export at
// all, which was silently no-op'ing every run of this function before this fix.
//
// This function is idempotent: every upsert keys off chain_bounty_id / chain_submission_id /
// (bounty_id, contributor_wallet, category), so re-running it on a schedule never duplicates rows.
// If GENLAYER_CONTRACT_ADDRESS is unset (contract not deployed yet), it logs and no-ops cleanly.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient as createSupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { createClient as createGenlayerClient } from "https://esm.sh/genlayer-js@1.1.8";
import * as genlayerChains from "https://esm.sh/genlayer-js@1.1.8/chains";

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

// Wei (18-decimal integer, as returned by the contract) -> decimal GEN string,
// via BigInt arithmetic so large amounts never lose precision the way a plain
// Number division would.
function weiToGen(wei: number | string): string {
  const bi = BigInt(wei);
  const divisor = 1_000_000_000_000_000_000n;
  const whole = bi / divisor;
  const remainder = bi % divisor;
  if (remainder === 0n) return whole.toString();
  const remStr = remainder.toString().padStart(18, "0").replace(/0+$/, "");
  return `${whole.toString()}.${remStr}`;
}

function tsToIso(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString();
}

function splitCriteria(criteria: string): string[] {
  return criteria
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
}

// Contract status names -> the bounty_status enum in 0001_init.sql. The contract has no
// separate "submissions closed but not yet evaluating" state (close + evaluate happen in one
// call from the sponsor's perspective), so 'submissions_closed' is never produced here.
const STATUS_MAP: Record<string, string> = {
  OPEN_FOR_SUBMISSIONS: "open",
  EVALUATING: "evaluating",
  SETTLED: "settled",
  CANCELLED: "cancelled",
  TIMED_OUT_RECOVERED: "settled",
};

// Submission ids are scoped per-bounty in the contract (not globally unique), but
// submissions.chain_submission_id has a global UNIQUE constraint — encode both into one
// value. MAX_SUBMISSIONS_PER_BOUNTY is 40, so this leaves ample headroom.
function chainSubmissionId(bountyId: number, submissionId: number): number {
  return bountyId * 1_000_000 + submissionId;
}

interface RawBounty {
  id: number;
  sponsor: string;
  title: string;
  description: string;
  category: string;
  reward_pool: number | string;
  status: string;
  created_ts: number;
  submission_deadline_ts: number;
  evaluation_criteria: string;
}

interface RawSubmission {
  id: number;
  bounty_id: number;
  contributor: string;
  evidence_url: string;
  summary: string;
  submitted_ts: number;
  extracted_category: string;
  influence_weight_bps: number;
  reward_owed: number | string;
  paid: boolean;
}

async function readContractState() {
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

  const bounties = (await client.readContract({
    address: CONTRACT_ADDRESS!,
    functionName: "get_bounties",
    args: [0, 50, "", ""],
  })) as RawBounty[];

  const submissionsByBounty = await Promise.all(
    bounties.map((b) =>
      client.readContract({
        address: CONTRACT_ADDRESS!,
        functionName: "get_submissions",
        args: [b.id],
      }) as Promise<RawSubmission[]>,
    ),
  );

  return { bounties, submissionsByBounty };
}

async function upsertBounties(
  bounties: RawBounty[],
  debugErrors: string[],
): Promise<Map<number, string>> {
  const idMap = new Map<number, string>();
  for (const b of bounties) {
    const { data, error } = await db
      .from("bounties")
      .upsert(
        {
          chain_bounty_id: b.id,
          sponsor_wallet: b.sponsor.toLowerCase(),
          title: b.title,
          description: b.description,
          category: b.category,
          reward_pool_gen: weiToGen(b.reward_pool),
          status: STATUS_MAP[b.status] ?? "open",
          submission_deadline: tsToIso(b.submission_deadline_ts),
          evaluation_criteria: splitCriteria(b.evaluation_criteria),
        },
        { onConflict: "chain_bounty_id" },
      )
      .select("id, chain_bounty_id")
      .single();
    if (error) {
      console.error("upsert bounty failed", b.id, error.message);
      debugErrors.push(`bounty ${b.id}: ${error.message}`);
      continue;
    }
    idMap.set(b.id, data.id);
  }
  return idMap;
}

async function upsertSubmissions(
  bountyId: number,
  submissions: RawSubmission[],
  supabaseBountyId: string,
) {
  for (const s of submissions) {
    const { error } = await db.from("submissions").upsert(
      {
        chain_submission_id: chainSubmissionId(bountyId, s.id),
        bounty_id: supabaseBountyId,
        contributor_wallet: s.contributor.toLowerCase(),
        evidence_url: s.evidence_url || null,
        summary: s.summary,
        submitted_at: tsToIso(s.submitted_ts),
      },
      { onConflict: "chain_submission_id" },
    );
    if (error) console.error("upsert submission failed", bountyId, s.id, error.message);
  }
}

// Contribution-graph rows are derived from evaluated submissions (influence_weight_bps > 0),
// not a separate contract call. Returns bounty/contributor pairs that just transitioned to paid,
// so the caller can fan out notifications for them.
async function upsertGraphEntries(
  bountyId: number,
  bountyStatus: string,
  submissions: RawSubmission[],
  supabaseBountyId: string,
): Promise<Array<{ bounty_id: string; contributor_wallet: string; reward_owed_gen: string }>> {
  const newlySettled: Array<{ bounty_id: string; contributor_wallet: string; reward_owed_gen: string }> = [];
  const evaluated = submissions.filter((s) => s.influence_weight_bps > 0);

  for (const s of evaluated) {
    const category = s.extracted_category || "uncategorized";
    const contributorWallet = s.contributor.toLowerCase();

    const { data: existing } = await db
      .from("contribution_graph_entries")
      .select("id, tx_hash_settled")
      .eq("bounty_id", supabaseBountyId)
      .eq("contributor_wallet", contributorWallet)
      .eq("category", category)
      .maybeSingle();

    const wasUnsettled = !existing?.tx_hash_settled;
    // The contract's view methods don't expose a per-payout tx hash — `paid` plus the bounty
    // having reached SETTLED is the closest on-chain-derived signal available. Use a synthetic,
    // clearly-labeled marker rather than fabricating a fake hash.
    const settledMarker =
      s.paid && bountyStatus === "settled" ? `settled:bounty-${bountyId}` : null;

    const { error } = await db.from("contribution_graph_entries").upsert(
      {
        bounty_id: supabaseBountyId,
        contributor_wallet: contributorWallet,
        category,
        influence_weight_bps: s.influence_weight_bps,
        reward_owed_gen: weiToGen(s.reward_owed),
        tx_hash_settled: settledMarker,
      },
      { onConflict: "bounty_id,contributor_wallet,category" },
    );
    if (error) {
      console.error("upsert contribution_graph_entries failed", bountyId, s.contributor, error.message);
      continue;
    }

    if (wasUnsettled && settledMarker) {
      newlySettled.push({
        bounty_id: supabaseBountyId,
        contributor_wallet: contributorWallet,
        reward_owed_gen: weiToGen(s.reward_owed),
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
    const debugErrors: string[] = [];
    const { bounties, submissionsByBounty } = await readContractState();
    const bountyIdMap = await upsertBounties(bounties, debugErrors);

    let totalSubmissions = 0;
    let totalGraphEntries = 0;
    const allNewlySettled: Array<{ bounty_id: string; contributor_wallet: string; reward_owed_gen: string }> = [];

    for (let i = 0; i < bounties.length; i++) {
      const b = bounties[i];
      const submissions = submissionsByBounty[i];
      const supabaseBountyId = bountyIdMap.get(b.id);
      if (!supabaseBountyId) continue;

      await upsertSubmissions(b.id, submissions, supabaseBountyId);
      totalSubmissions += submissions.length;

      const newlySettled = await upsertGraphEntries(
        b.id,
        STATUS_MAP[b.status] ?? "open",
        submissions,
        supabaseBountyId,
      );
      totalGraphEntries += submissions.filter((s) => s.influence_weight_bps > 0).length;
      allNewlySettled.push(...newlySettled);
    }

    await notifyNewlySettled(allNewlySettled);

    const { error: refreshErr } = await db.rpc("refresh_platform_analytics");
    if (refreshErr) console.error("failed to refresh analytics views", refreshErr.message);

    return json({
      status: "ok",
      bounties: bounties.length,
      bounties_upserted: bountyIdMap.size,
      submissions: totalSubmissions,
      graph_entries: totalGraphEntries,
      newly_settled: allNewlySettled.length,
      debug_errors: debugErrors,
    });
  } catch (e) {
    console.error("sync-chain-state failed", e);
    return json({ status: "error", detail: String(e) }, 500);
  }
});
