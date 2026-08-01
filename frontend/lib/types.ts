// Types mirroring backend/supabase/migrations/0001_init.sql + 0002_search_and_views.sql.
// Source of truth is the on-chain contract; these rows are the Supabase mirror
// kept in sync by backend/supabase/functions/sync-chain-state.

export type BountyStatus =
  | "open"
  | "submissions_closed"
  | "evaluating"
  | "settled"
  | "cancelled";

export type Bounty = {
  id: string;
  chainBountyId: number | null;
  sponsorWallet: string;
  title: string;
  description: string;
  category: string;
  rewardPoolGen: number;
  status: BountyStatus;
  submissionDeadline: string | null;
  evaluationCriteria: string[];
  createdAt: string;
};

export type Submission = {
  id: string;
  bountyId: string;
  contributorWallet: string;
  evidenceUrl: string | null;
  summary: string;
  submittedAt: string;
};

export type ContributionGraphEntry = {
  id: string;
  bountyId: string;
  contributorWallet: string;
  category: string;
  influenceWeightBps: number;
  rewardOwedGen: number;
  reasoningExcerpt: string | null;
  txHashSettled: string | null;
};

export type PlatformStats = {
  totalBounties: number;
  totalBountiesSettled: number;
  totalGenDistributed: number;
  totalContributors: number;
  totalSubmissions: number;
};

export type Profile = {
  id: string;
  walletAddress: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
};
