"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { getBounties, getPlatformStats } from "@/lib/data";
import { genlayerClient, getGenlayerWriteClient, VERTEX_CONTRACT_ADDRESS, ensureStudioNetwork } from "@/lib/genlayer";
import type { Bounty, PlatformStats } from "@/lib/types";
import { formatGen, truncateAddress } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";

export default function AdminDashboardPage() {
  const { address } = useAccount();
  const [owner, setOwner] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [pauseBusy, setPauseBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getBounties(), getPlatformStats()]).then(([b, stats]) => {
      if (cancelled) return;
      setBounties(b);
      setPlatformStats(stats);
    });
    genlayerClient
      .readContract({
        address: VERTEX_CONTRACT_ADDRESS as `0x${string}`,
        functionName: "get_config",
        args: [],
      })
      .then((config) => {
        if (cancelled) return;
        const c = config as { owner: string; paused: boolean };
        setOwner(c.owner);
        setPaused(c.paused);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isOwner = !!address && !!owner && address.toLowerCase() === owner.toLowerCase();

  function pushLog(msg: string) {
    setLog((l) => [msg, ...l].slice(0, 5));
  }

  async function handleTogglePause() {
    if (!address) return;
    setPauseBusy(true);
    try {
      await ensureStudioNetwork();
      const client = getGenlayerWriteClient(address as `0x${string}`);
      const hash = await client.writeContract({
        address: VERTEX_CONTRACT_ADDRESS as `0x${string}`,
        functionName: paused ? "unpause" : "pause",
        args: [],
        value: BigInt(0),
      });
      pushLog(`${paused ? "Unpause" : "Pause"} tx submitted: ${hash}`);
      await client.waitForTransactionReceipt({ hash, status: "ACCEPTED" as never });
      setPaused((p) => !p);
      pushLog(`Platform ${paused ? "resumed" : "paused"} on-chain.`);
    } catch (e) {
      pushLog(`Failed: ${e instanceof Error ? e.message : "transaction rejected"}`);
    } finally {
      setPauseBusy(false);
    }
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
        <Stat label="Total Bounties" value={String(platformStats?.totalBounties ?? 0)} />
        <Stat label="GEN Distributed" value={formatGen(platformStats?.totalGenDistributed ?? 0)} />
        <Stat label="Contributors" value={String(platformStats?.totalContributors ?? 0)} />
        <Stat label="Settled Bounties" value={String(platformStats?.totalBountiesSettled ?? 0)} />
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
          {!isOwner ? (
            <p className="text-xs font-mono text-t3">
              Connect the contract owner wallet{owner ? ` (${truncateAddress(owner, 6)})` : ""} to
              access this control.
            </p>
          ) : (
            <Button
              variant={paused ? "primary" : "ghost"}
              className={paused ? "" : "border-rose/30 hover:border-rose/60"}
              onClick={handleTogglePause}
              disabled={pauseBusy}
            >
              {pauseBusy ? "Submitting..." : paused ? "Resume Platform" : "Pause Platform"}
            </Button>
          )}
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
                <div className="font-mono text-[.65rem] text-t3">{truncateAddress(b.sponsorWallet, 6)}</div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={b.status} />
                <span className="font-mono text-xs text-t2">{formatGen(b.rewardPoolGen)} GEN</span>
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
