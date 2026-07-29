"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/states/EmptyState";
import { StatusBadge } from "@/components/ui/Badge";
import { bounties, contributors } from "@/lib/mockData";
import { truncateAddress } from "@/lib/utils";

export default function SearchPage() {
  const [query, setQuery] = useState("");

  const matchedBounties = useMemo(
    () =>
      query.trim() === ""
        ? []
        : bounties.filter((b) => b.title.toLowerCase().includes(query.toLowerCase())),
    [query]
  );

  const matchedContributors = useMemo(
    () =>
      query.trim() === ""
        ? []
        : contributors.filter(
            (c) =>
              c.name.toLowerCase().includes(query.toLowerCase()) ||
              c.category.toLowerCase().includes(query.toLowerCase())
          ),
    [query]
  );

  const hasQuery = query.trim() !== "";
  const hasResults = matchedBounties.length > 0 || matchedContributors.length > 0;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-2 text-center">
        <span className="text-gradient">Search</span> Vertex
      </h1>
      <p className="text-t2 text-center mb-8">
        Find bounties, sponsors, and contributors across the platform.
      </p>

      <label htmlFor="global-search" className="sr-only">
        Search bounties and contributors
      </label>
      <input
        id="global-search"
        type="search"
        autoFocus
        placeholder="Search bounties, contributors, categories..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded-xl border border-wist/15 bg-prus2/50 px-5 py-3.5 text-base text-t1 placeholder:text-t3 outline-none focus:border-maj mb-8 focus-visible:outline focus-visible:outline-2 focus-visible:outline-wist"
      />

      {!hasQuery && (
        <p className="text-center text-t3 text-sm font-mono">
          Start typing to search — TODO: wire to a real full-text index
          (Supabase `pg_trgm`/`tsvector`) once the backend is live.
        </p>
      )}

      {hasQuery && !hasResults && (
        <EmptyState title="No results" message={`Nothing matched "${query}".`} />
      )}

      {matchedBounties.length > 0 && (
        <Section title="Bounties">
          <div className="flex flex-col gap-2">
            {matchedBounties.map((b) => (
              <Link key={b.id} href={`/bounties/${b.id}`} className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-wist rounded-2xl">
                <GlassCard className="p-4 flex items-center justify-between gap-4 flex-wrap">
                  <span className="font-display text-sm font-semibold text-t1">{b.title}</span>
                  <StatusBadge status={b.status} />
                </GlassCard>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {matchedContributors.length > 0 && (
        <Section title="Contributors">
          <div className="flex flex-col gap-2">
            {matchedContributors.map((c) => (
              <Link key={c.id} href={`/profile/${c.wallet}`} className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-wist rounded-2xl">
                <GlassCard className="p-4 flex items-center justify-between gap-4 flex-wrap">
                  <span className="font-display text-sm font-semibold text-t1">{c.name}</span>
                  <span className="font-mono text-xs text-t3">{truncateAddress(c.wallet, 6)}</span>
                </GlassCard>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-mono text-[.58rem] uppercase tracking-[.2em] text-t3">{title}</span>
        <span className="flex-1 h-px bg-gradient-to-r from-wist/[.12] to-transparent" />
      </div>
      {children}
    </div>
  );
}
