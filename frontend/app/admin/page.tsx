"use client";

import { useState } from "react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { bounties, platformStats } from "@/lib/mockData";
import { formatGen } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";

export default function AdminDashboardPage() {
  const [paused, setPaused] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  function pushLog(msg: string) {
    setLog((l) => [msg, ...l].slice(0, 5));
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-2">
        Admin <span className="text-gradient">Dashboard</span>
      </h1>
      <p className="text-t2 mb-8">
        Owner-only platform controls. Actions here are UI-only until wired to
        the deployed contract&apos;s owner-gated entrypoints.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <Stat label="Total Bounties" value={String(platformStats.totalBounties)} />
        <Stat label="GEN Distributed" value={formatGen(platformStats.totalGenDistributed)} />
        <Stat label="Contributors" value={String(platformStats.totalContributors)} />
        <Stat label="Active Bounties" value={String(platformStats.activeBounties)} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-10">
        <GlassCard className="p-6">
          <h2 className="font-display text-base font-semibold text-t1 mb-2">
            Platform Moderation
          </h2>
          <p className="text-sm text-t2 mb-5">
            Pause new bounty creation and submissions platform-wide in an
            emergency.
          </p>
          <Button
            variant={paused ? "primary" : "ghost"}
            className={paused ? "" : "border-rose/30 hover:border-rose/60"}
            onClick={() => {
              setPaused((p) => !p);
              // TODO: wire to GenLayer contract owner-only `set_paused` call.
              pushLog(paused ? "Requested: unpause platform" : "Requested: pause platform");
            }}
          >
            {paused ? "Resume Platform" : "Pause Platform"}
          </Button>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="font-display text-base font-semibold text-t1 mb-2">
            Bounty Moderation
          </h2>
          <p className="text-sm text-t2 mb-5">
            Remove a bounty listing that violates platform terms. This does
            not reverse any settled on-chain payouts.
          </p>
          <Button
            variant="ghost"
            className="border-rose/30 hover:border-rose/60"
            onClick={() => pushLog("Requested: flag bounty for moderation review")}
          >
            Flag a Bounty for Review
          </Button>
        </GlassCard>
      </div>

      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <span className="font-mono text-[.58rem] uppercase tracking-[.2em] text-t3">
            All Bounties
          </span>
          <span className="flex-1 h-px bg-gradient-to-r from-wist/[.12] to-transparent" />
        </div>
        <div className="flex flex-col gap-2">
          {bounties.map((b) => (
            <GlassCard key={b.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-display text-sm font-semibold text-t1">{b.title}</div>
                <div className="font-mono text-[.65rem] text-t3">{b.sponsor}</div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={b.status} />
                <span className="font-mono text-xs text-t2">{formatGen(b.prizeGen)} GEN</span>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>

      {log.length > 0 && (
        <GlassCard className="p-5">
          <h3 className="font-mono text-[.6rem] uppercase tracking-[.14em] text-t3 mb-3">
            Action Log (local only)
          </h3>
          <ul className="flex flex-col gap-1.5 font-mono text-xs text-t2">
            {log.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </GlassCard>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <GlassCard className="p-6 text-center">
      <div className="font-mono text-2xl text-gradient font-medium">{value}</div>
      <div className="font-mono text-[.58rem] uppercase tracking-[.14em] text-t3 mt-1">
        {label}
      </div>
    </GlassCard>
  );
}
