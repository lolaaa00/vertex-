import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatusBadge } from "@/components/ui/Badge";
import { formatGen, truncateAddress } from "@/lib/utils";
import type { Bounty } from "@/lib/types";

export function BountyCard({
  bounty,
  submissionCount = 0,
}: {
  bounty: Bounty;
  submissionCount?: number;
}) {
  return (
    <Link href={`/bounties/${bounty.id}`} className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-wist rounded-[20px]">
      <GlassCard className="p-6 h-full flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-4">
          <StatusBadge status={bounty.status} />
          <span className="font-mono text-sm font-medium text-alice bg-wist/[.06] border border-wist/15 px-3 py-1 rounded-lg">
            {formatGen(bounty.rewardPoolGen)} GEN
          </span>
        </div>
        <h3 className="font-display text-lg font-semibold tracking-tight text-t1 mb-2">
          {bounty.title}
        </h3>
        <p className="text-sm text-t2 leading-relaxed line-clamp-3 mb-4 flex-1">
          {bounty.description}
        </p>
        <div className="flex items-center justify-between font-mono text-[.7rem] text-t3 pt-3 border-t border-wist/[.08]">
          <span>{truncateAddress(bounty.sponsorWallet, 6)}</span>
          <span>{submissionCount} submissions</span>
        </div>
      </GlassCard>
    </Link>
  );
}
