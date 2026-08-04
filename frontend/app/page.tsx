import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { getOpenBountyCount, getPlatformStats } from "@/lib/data";
import { formatGen } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const [platformStats, activeBounties] = await Promise.all([
    getPlatformStats(),
    getOpenBountyCount(),
  ]);
  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid lg:grid-cols-[1.1fr_.9fr] gap-12 lg:gap-16 items-start mb-16">
        <div>
          <Badge className="mb-5">GenLayer StudioNet</Badge>

          <h1 className="font-display font-bold tracking-[-0.03em] leading-[1.05] text-4xl md:text-5xl mb-5">
            Merge competing solutions instead of choosing a single winner.
          </h1>

          <p className="text-base md:text-lg text-t2 leading-relaxed max-w-xl mb-8">
            Traditional bounties force one winner. <span className="text-t1">Vertex</span> uses a
            GenLayer Intelligent Contract to reason across every submission to a bounty together,
            build a Contribution Graph, and distribute rewards by actual impact.
          </p>

          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/bounties">Explore a bounty</ButtonLink>
            <ButtonLink href="/bounties" variant="ghost">
              See a Contribution Graph
            </ButtonLink>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-px bg-wist/10 rounded-xl overflow-hidden border border-wist/10">
          <Stat value={formatGen(platformStats.totalGenDistributed)} label="GEN Distributed" />
          <Stat value={String(platformStats.totalContributors)} label="Contributors" />
          <Stat value={String(platformStats.totalBounties)} label="Bounties" />
          <Stat value={String(activeBounties)} label="Open Now" />
        </dl>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <GlassCard className="p-6">
          <div className="font-mono text-[.62rem] uppercase tracking-[.16em] text-rose2 mb-4">
            Traditional bounties
          </div>
          <h3 className="font-display text-lg font-semibold tracking-tight mb-2">
            One winner takes all
          </h3>
          <p className="text-sm text-t2 leading-relaxed mb-4">
            Five submit, one wins, four lose everything — regardless of merit.
          </p>
          <ul className="flex flex-col gap-2 text-sm text-t2">
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-rose/60 shrink-0" aria-hidden="true" />
              Best security work: loses
            </li>
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-rose/60 shrink-0" aria-hidden="true" />
              Best UI/UX: loses
            </li>
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-rose/60 shrink-0" aria-hidden="true" />
              Best performance work: loses
            </li>
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-rose/60 shrink-0" aria-hidden="true" />
              Best documentation: loses
            </li>
          </ul>
        </GlassCard>

        <GlassCard className="p-6 border-maj/25">
          <div className="font-mono text-[.62rem] uppercase tracking-[.16em] text-wist mb-4">
            Vertex on GenLayer
          </div>
          <h3 className="font-display text-lg font-semibold tracking-tight mb-2">
            Every contribution valued
          </h3>
          <p className="text-sm text-t2 leading-relaxed mb-4">
            The Intelligent Contract reasons across all submissions together and distributes GEN
            proportionally.
          </p>
          <ul className="flex flex-col gap-2 text-sm text-t2">
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-vgreen shrink-0" aria-hidden="true" />
              Security: 30% to Alice
            </li>
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-vgreen shrink-0" aria-hidden="true" />
              UI/UX: 20% to Bob
            </li>
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-vgreen shrink-0" aria-hidden="true" />
              Performance: 25% to Carol
            </li>
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-vgreen shrink-0" aria-hidden="true" />
              Recovery: 15% to Dave
            </li>
          </ul>
        </GlassCard>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-prus2 p-5">
      <dd className="font-mono text-2xl font-semibold text-t1">{value}</dd>
      <dt className="font-mono text-[.6rem] uppercase tracking-[.14em] text-t3 mt-1">{label}</dt>
    </div>
  );
}
