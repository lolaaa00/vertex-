// Real Supabase reads, replacing lib/mockData.ts. Safe to call from both
// Server and Client Components — the shared `supabase` client uses the
// public anon key over Supabase's REST API, gated by the RLS policies in
// backend/supabase/migrations/0001_init.sql (marketplace data is publicly
// readable; writes go through Edge Functions / the contract, not this file).

import { supabase } from "./supabase";
import type {
  Bounty,
  ContributionGraphEntry,
  PlatformStats,
  Profile,
  Submission,
} from "./types";

function mapBounty(row: any): Bounty {
  return {
    id: row.id,
    chainBountyId: row.chain_bounty_id,
    sponsorWallet: row.sponsor_wallet,
    title: row.title,
    description: row.description,
    category: row.category,
    rewardPoolGen: Number(row.reward_pool_gen),
    status: row.status,
    submissionDeadline: row.submission_deadline,
    evaluationCriteria: row.evaluation_criteria ?? [],
    createdAt: row.created_at,
  };
}

function mapSubmission(row: any): Submission {
  return {
    id: row.id,
    bountyId: row.bounty_id,
    contributorWallet: row.contributor_wallet,
    evidenceUrl: row.evidence_url,
    summary: row.summary,
    submittedAt: row.submitted_at,
  };
}

function mapGraphEntry(row: any): ContributionGraphEntry {
  return {
    id: row.id,
    bountyId: row.bounty_id,
    contributorWallet: row.contributor_wallet,
    category: row.category,
    influenceWeightBps: row.influence_weight_bps,
    rewardOwedGen: Number(row.reward_owed_gen),
    reasoningExcerpt: row.reasoning_excerpt,
    txHashSettled: row.tx_hash_settled,
  };
}

export async function getBounties(): Promise<Bounty[]> {
  const { data, error } = await supabase
    .from("bounties")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[lib/data] getBounties failed:", error.message);
    return [];
  }
  return (data ?? []).map(mapBounty);
}

export async function getBounty(id: string): Promise<Bounty | null> {
  const { data, error } = await supabase
    .from("bounties")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return mapBounty(data);
}

export async function getBountiesBySponsor(wallet: string): Promise<Bounty[]> {
  const { data, error } = await supabase
    .from("bounties")
    .select("*")
    .ilike("sponsor_wallet", wallet)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map(mapBounty);
}

export async function getSubmissionsForBounty(bountyId: string): Promise<Submission[]> {
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("bounty_id", bountyId)
    .order("submitted_at", { ascending: true });
  if (error) return [];
  return (data ?? []).map(mapSubmission);
}

export async function getSubmissionsByContributor(wallet: string): Promise<Submission[]> {
  const { data, error } = await supabase
    .from("submissions")
    .select("*")
    .ilike("contributor_wallet", wallet)
    .order("submitted_at", { ascending: false });
  if (error) return [];
  return (data ?? []).map(mapSubmission);
}

// Bounty id -> submission count, for list views that show a count badge
// without needing every submission row.
export async function getSubmissionCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from("submissions").select("bounty_id");
  if (error || !data) return {};
  const counts: Record<string, number> = {};
  for (const row of data as { bounty_id: string }[]) {
    counts[row.bounty_id] = (counts[row.bounty_id] ?? 0) + 1;
  }
  return counts;
}

export async function getContributionGraphForBounty(
  bountyId: string
): Promise<ContributionGraphEntry[]> {
  const { data, error } = await supabase
    .from("contribution_graph_entries")
    .select("*")
    .eq("bounty_id", bountyId);
  if (error) return [];
  return (data ?? []).map(mapGraphEntry);
}

export async function getContributionGraphByContributor(
  wallet: string
): Promise<ContributionGraphEntry[]> {
  const { data, error } = await supabase
    .from("contribution_graph_entries")
    .select("*")
    .ilike("contributor_wallet", wallet);
  if (error) return [];
  return (data ?? []).map(mapGraphEntry);
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const { data, error } = await supabase.from("platform_analytics").select("*").maybeSingle();
  if (error || !data) {
    return {
      totalBounties: 0,
      totalBountiesSettled: 0,
      totalGenDistributed: 0,
      totalContributors: 0,
      totalSubmissions: 0,
    };
  }
  return {
    totalBounties: data.total_bounties ?? 0,
    totalBountiesSettled: data.total_bounties_settled ?? 0,
    totalGenDistributed: Number(data.total_gen_distributed ?? 0),
    totalContributors: data.total_contributors ?? 0,
    totalSubmissions: data.total_submissions ?? 0,
  };
}

export async function getOpenBountyCount(): Promise<number> {
  const { count, error } = await supabase
    .from("bounties")
    .select("*", { count: "exact", head: true })
    .eq("status", "open");
  if (error || count == null) return 0;
  return count;
}

export async function getGenByCategory(): Promise<{ category: string; gen: number }[]> {
  const { data, error } = await supabase
    .from("contribution_graph_entries")
    .select("category, reward_owed_gen")
    .not("tx_hash_settled", "is", null);
  if (error || !data) return [];
  const totals: Record<string, number> = {};
  for (const row of data as { category: string; reward_owed_gen: number }[]) {
    totals[row.category] = (totals[row.category] ?? 0) + Number(row.reward_owed_gen);
  }
  return Object.entries(totals)
    .map(([category, gen]) => ({ category, gen }))
    .sort((a, b) => b.gen - a.gen);
}

export async function getSubmissionsPerCategory(): Promise<
  { category: string; submissionCount: number }[]
> {
  const { data, error } = await supabase
    .from("submissions_per_category")
    .select("*")
    .order("submission_count", { ascending: false });
  if (error) return [];
  return (data ?? []).map((row) => ({
    category: row.category,
    submissionCount: row.submission_count,
  }));
}

export async function searchBounties(query: string): Promise<Bounty[]> {
  if (!query.trim()) return [];
  const { data, error } = await supabase.rpc("search_bounties", { query });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("[lib/data] searchBounties failed:", error.message);
    return [];
  }
  return (data ?? []).map(mapBounty);
}

export async function searchProfiles(query: string): Promise<Profile[]> {
  if (!query.trim()) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .or(`display_name.ilike.%${query}%,wallet_address.ilike.%${query}%`)
    .limit(20);
  if (error) return [];
  return (data ?? []).map(mapProfile);
}

function mapProfile(row: any): Profile {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
  };
}

export async function getProfileByWallet(wallet: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .ilike("wallet_address", wallet)
    .maybeSingle();
  if (error || !data) return null;
  return mapProfile(data);
}

export type SocialConnection = {
  provider: "github" | "x";
  providerUsername: string;
};

export async function getSocialConnections(profileId: string): Promise<SocialConnection[]> {
  const { data, error } = await supabase
    .from("social_connections")
    .select("provider, provider_username")
    .eq("user_id", profileId);
  if (error || !data) return [];
  return data.map((row) => ({
    provider: row.provider,
    providerUsername: row.provider_username,
  }));
}
