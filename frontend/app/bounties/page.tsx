"use client";

import { useEffect, useMemo, useState } from "react";
import { BountyCard } from "@/components/bounty/BountyCard";
import { EmptyState } from "@/components/states/EmptyState";
import { getBounties, getSubmissionCounts } from "@/lib/data";
import type { Bounty, BountyStatus } from "@/lib/types";

const statusOptions: { value: BountyStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "submissions_closed", label: "Submissions Closed" },
  { value: "evaluating", label: "Evaluating" },
  { value: "settled", label: "Settled" },
  { value: "cancelled", label: "Cancelled" },
];

export default function BountyExplorerPage() {
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [submissionCounts, setSubmissionCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<BountyStatus | "all">("all");
  const [category, setCategory] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    Promise.all([getBounties(), getSubmissionCounts()]).then(([b, counts]) => {
      if (cancelled) return;
      setBounties(b);
      setSubmissionCounts(counts);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(bounties.map((b) => b.category)))],
    [bounties]
  );

  const filtered = bounties.filter((b) => {
    const matchesQuery =
      query.trim() === "" ||
      b.title.toLowerCase().includes(query.toLowerCase()) ||
      b.sponsorWallet.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = status === "all" || b.status === status;
    const matchesCategory = category === "all" || b.category === category;
    return matchesQuery && matchesStatus && matchesCategory;
  });

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-2">
        Bounty <span className="text-gradient">Explorer</span>
      </h1>
      <p className="text-t2 mb-8">
        Every bounty here pays out by verified contribution, not a single
        winner-take-all vote.
      </p>

      <div className="flex flex-col md:flex-row gap-3 mb-8">
        <label className="sr-only" htmlFor="bounty-search">
          Search bounties
        </label>
        <input
          id="bounty-search"
          type="search"
          placeholder="Search by title or sponsor..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 rounded-lg border border-wist/15 bg-prus2/50 px-4 py-2.5 text-sm text-t1 placeholder:text-t3 outline-none focus:border-maj focus-visible:outline focus-visible:outline-2 focus-visible:outline-wist"
        />
        <select
          aria-label="Filter by status"
          value={status}
          onChange={(e) => setStatus(e.target.value as BountyStatus | "all")}
          className="rounded-lg border border-wist/15 bg-prus2/50 px-4 py-2.5 text-sm text-t1 outline-none focus:border-maj focus-visible:outline focus-visible:outline-2 focus-visible:outline-wist"
        >
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-wist/15 bg-prus2/50 px-4 py-2.5 text-sm text-t1 outline-none focus:border-maj focus-visible:outline focus-visible:outline-2 focus-visible:outline-wist"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? "All categories" : c}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <EmptyState title="Loading bounties..." message="Fetching the latest bounties from Supabase." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No bounties match your filters"
          message="Try clearing the search or choosing a different status/category."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((b) => (
            <BountyCard key={b.id} bounty={b} submissionCount={submissionCounts[b.id] ?? 0} />
          ))}
        </div>
      )}
    </div>
  );
}
