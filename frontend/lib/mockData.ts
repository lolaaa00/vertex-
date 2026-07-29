// Central mock/placeholder data used across the app until Supabase + the
// GenLayer Intelligent Contract are wired up. Every consumer of this module
// should be treated as a TODO surface — see lib/supabase.ts and
// lib/genlayer.ts for the real data sources this will be replaced with.

export type BountyStatus = "open" | "evaluating" | "complete";

export type Contributor = {
  id: string;
  name: string;
  wallet: string;
  avatarLetter: string;
  colorKey: "a" | "b" | "c" | "d" | "e";
  category: string;
  githubHandle?: string;
  xHandle?: string;
};

export type Submission = {
  id: string;
  bountyId: string;
  contributor: Contributor;
  category: string;
  excerpt: string;
  submittedAt: string;
};

export type Bounty = {
  id: string;
  title: string;
  description: string;
  evaluationCriteria: string[];
  sponsor: string;
  sponsorWallet: string;
  category: string;
  status: BountyStatus;
  prizeGen: number;
  submissionCount: number;
  createdAt: string;
};

export const CONTRIBUTOR_COLORS: Record<
  Contributor["colorKey"],
  { text: string; bg: string; border: string }
> = {
  a: { text: "text-wist", bg: "bg-maj/10", border: "border-maj/30" },
  b: { text: "text-cyan", bg: "bg-cyan/10", border: "border-cyan/30" },
  c: { text: "text-vgreen", bg: "bg-vgreen/10", border: "border-vgreen/30" },
  d: { text: "text-amber", bg: "bg-amber/10", border: "border-amber/25" },
  e: { text: "text-rose", bg: "bg-rose/10", border: "border-rose/25" },
};

export const contributors: Contributor[] = [
  { id: "alice", name: "Alice", wallet: "0x4a7f1c8e...d291c847", avatarLetter: "A", colorKey: "a", category: "Security", githubHandle: "alice-dev" },
  { id: "bob", name: "Bob", wallet: "0x8c1b2a99...3f77e102", avatarLetter: "B", colorKey: "b", category: "UI/UX Design", xHandle: "bobmakes" },
  { id: "carol", name: "Carol", wallet: "0x2d9ef711...a8415c33", avatarLetter: "C", colorKey: "c", category: "Performance", githubHandle: "carol-codes" },
  { id: "dave", name: "Dave", wallet: "0x9f3ca204...e412bb90", avatarLetter: "D", colorKey: "d", category: "Recovery" },
  { id: "emma", name: "Emma", wallet: "0x7b2af601...d8199a4e", avatarLetter: "E", colorKey: "e", category: "Documentation", xHandle: "emmawrites" },
];

export const bounties: Bounty[] = [
  {
    id: "did-platform",
    title: "Build the Best Decentralized Identity Platform",
    description:
      "Design and implement a decentralized identity system with authentication, key recovery, privacy controls, and developer documentation. GenLayer evaluates all submissions and merges the strongest contributions.",
    evaluationCriteria: [
      "Cryptographic soundness of the authentication scheme",
      "Usability and accessibility of the onboarding flow",
      "Verification latency and horizontal scalability",
      "Robustness of the account/key recovery mechanism",
      "Completeness and clarity of developer documentation",
    ],
    sponsor: "Vertex Foundation",
    sponsorWallet: "0x1111...2222",
    category: "Identity",
    status: "complete",
    prizeGen: 15000,
    submissionCount: 5,
    createdAt: "2026-06-02",
  },
  {
    id: "onchain-analytics",
    title: "On-Chain Analytics Dashboard for GenLayer Validators",
    description:
      "Build a public dashboard tracking validator participation, consensus latency, and equivalence-principle agreement rates across GenLayer StudioNet.",
    evaluationCriteria: [
      "Data accuracy against StudioNet RPC",
      "Dashboard clarity and information density",
      "Refresh performance under load",
    ],
    sponsor: "GenLayer Labs",
    sponsorWallet: "0x3333...4444",
    category: "Tooling",
    status: "open",
    prizeGen: 8000,
    submissionCount: 2,
    createdAt: "2026-07-10",
  },
  {
    id: "mobile-wallet-ux",
    title: "Mobile-First Wallet Onboarding Redesign",
    description:
      "Redesign the first-run wallet connection and SIWE sign-in experience for mobile, targeting sub-3-tap onboarding with full accessibility support.",
    evaluationCriteria: [
      "Time-to-first-signed-transaction on mobile",
      "WCAG 2.1 AA compliance",
      "Visual polish consistent with brand system",
    ],
    sponsor: "Vertex Foundation",
    sponsorWallet: "0x1111...2222",
    category: "Design",
    status: "evaluating",
    prizeGen: 5000,
    submissionCount: 4,
    createdAt: "2026-07-20",
  },
  {
    id: "docs-generator",
    title: "Automated Contract Documentation Generator",
    description:
      "Build a tool that generates human-readable documentation from GenLayer Intelligent Contract source, including deterministic/non-deterministic call annotations.",
    evaluationCriteria: [
      "Coverage of GenVM-specific constructs",
      "Output readability",
      "Ease of CI integration",
    ],
    sponsor: "GenLayer Labs",
    sponsorWallet: "0x3333...4444",
    category: "Tooling",
    status: "open",
    prizeGen: 3500,
    submissionCount: 0,
    createdAt: "2026-07-25",
  },
];

export const submissions: Submission[] = [
  {
    id: "sub-alice",
    bountyId: "did-platform",
    contributor: contributors[0],
    category: "Security",
    excerpt:
      "Zero-knowledge proof authentication with BLS signature aggregation. Novel credential revocation using merkle exclusion proofs.",
    submittedAt: "2026-06-10",
  },
  {
    id: "sub-bob",
    bountyId: "did-platform",
    contributor: contributors[1],
    category: "UI/UX Design",
    excerpt:
      "Elegant onboarding with progressive disclosure. Biometric-first design with fallback auth. Fully accessible and responsive.",
    submittedAt: "2026-06-11",
  },
  {
    id: "sub-carol",
    bountyId: "did-platform",
    contributor: contributors[2],
    category: "Performance",
    excerpt:
      "Edge-cached DID resolution. Sub-50ms credential verification. Horizontal scaling at 10K verifications per second.",
    submittedAt: "2026-06-12",
  },
  {
    id: "sub-dave",
    bountyId: "did-platform",
    contributor: contributors[3],
    category: "Recovery",
    excerpt:
      "Social recovery with Shamir secret sharing and time-locked guardian rotation. Dead man's switch for estate planning.",
    submittedAt: "2026-06-13",
  },
  {
    id: "sub-emma",
    bountyId: "did-platform",
    contributor: contributors[4],
    category: "Documentation",
    excerpt:
      "Complete developer docs with interactive examples, migration guides, SDK references, and a standards-ready specification.",
    submittedAt: "2026-06-14",
  },
];

export type ContributionGraphNode = {
  contributor: Contributor;
  pct: number;
  rewardGen: number;
};

export const contributionGraph: ContributionGraphNode[] = [
  { contributor: contributors[0], pct: 30, rewardGen: 4500 },
  { contributor: contributors[1], pct: 20, rewardGen: 3000 },
  { contributor: contributors[2], pct: 25, rewardGen: 3750 },
  { contributor: contributors[3], pct: 15, rewardGen: 2250 },
  { contributor: contributors[4], pct: 10, rewardGen: 1500 },
];

export const settlementDetails = {
  // TODO: wire to GenLayer contract read (gl.message receipt) once the
  // contract address is available — see lib/genlayer.ts.
  settlementTx: "0x4a7f1c8e...d291c847",
  block: "14,847,291 / StudioNet",
  contract: "VertexBountyFusion v1",
  consensus: "5/5 validators / Equivalence confirmed",
};

export const platformStats = {
  totalBounties: bounties.length,
  totalGenDistributed: 42750,
  totalContributors: contributors.length,
  activeBounties: bounties.filter((b) => b.status === "open").length,
};
