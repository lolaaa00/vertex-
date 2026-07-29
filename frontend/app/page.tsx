import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { platformStats } from "@/lib/mockData";
import { formatGen } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="flex flex-col items-center text-center max-w-5xl mx-auto">
      <div
        className="pointer-events-none absolute left-1/2 top-[30%] -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] max-w-[90vw] max-h-[90vw] rounded-full blur-[2px] -z-10 animate-breathe motion-reduce:animate-none"
        style={{
          background:
            "radial-gradient(circle, transparent 38%, rgba(106,77,212,.35) 50%, transparent 72%)",
        }}
        aria-hidden="true"
      />

      <Badge className="mb-6">GenLayer StudioNet</Badge>

      <h1 className="font-display font-bold tracking-[-0.05em] leading-[0.92] text-[clamp(3rem,10vw,7rem)] mb-4">
        <span className="text-gradient">Vertex</span>
      </h1>

      <p className="font-display text-xl md:text-2xl font-semibold tracking-[-0.02em] text-wist mb-6">
        Merge competing solutions instead of choosing a single winner.
      </p>

      <p className="text-base md:text-lg text-wist leading-relaxed max-w-xl mb-10">
        Traditional bounties force one winner.{" "}
        <span className="text-alice">
          Vertex uses GenLayer Intelligent Contracts
        </span>{" "}
        to reason across every submission, build a Contribution Graph, and
        distribute rewards by actual impact.
      </p>

      <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6 items-center max-w-4xl w-full mb-12">
        <GlassCard className="p-7 text-left">
          <div className="font-mono text-[.58rem] uppercase tracking-[.18em] text-rose mb-4">
            Traditional Bounties
          </div>
          <h3 className="font-display text-lg font-semibold tracking-tight mb-2.5">
            One winner takes all
          </h3>
          <p className="text-sm text-t2 leading-relaxed mb-3">
            5 submit, 1 wins, 4 lose everything &mdash; regardless of merit.
          </p>
          <ul className="flex flex-col gap-1.5 font-mono text-xs text-t2">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-rose/50 shrink-0" />
              Best security work: loses
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-rose/50 shrink-0" />
              Best UI/UX: loses
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-rose/50 shrink-0" />
              Best performance work: loses
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-rose/50 shrink-0" />
              Best documentation: loses
            </li>
          </ul>
        </GlassCard>

        <div className="hidden md:block text-2xl text-maj/40" aria-hidden="true">
          &#8594;
        </div>

        <GlassCard className="p-7 text-left">
          <div className="font-mono text-[.58rem] uppercase tracking-[.18em] text-wist mb-4">
            Vertex on GenLayer
          </div>
          <h3 className="font-display text-lg font-semibold tracking-tight mb-2.5">
            Every contribution valued
          </h3>
          <p className="text-sm text-t2 leading-relaxed mb-3">
            A validator-run Intelligent Contract reasons across all
            submissions and distributes GEN proportionally.
          </p>
          <ul className="flex flex-col gap-1.5 font-mono text-xs text-t2">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-maj/70 shrink-0" />
              Security: 30% to Alice
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-maj/70 shrink-0" />
              UI/UX: 20% to Bob
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-maj/70 shrink-0" />
              Performance: 25% to Carol
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-maj/70 shrink-0" />
              Recovery: 15% to Dave
            </li>
          </ul>
        </GlassCard>
      </div>

      <div className="flex flex-wrap gap-3.5 justify-center mb-14">
        <ButtonLink href="/bounties">Explore a Bounty &#8594;</ButtonLink>
        <ButtonLink href="/bounties/did-platform/graph" variant="ghost">
          See Contribution Graph
        </ButtonLink>
      </div>

      <div className="flex flex-wrap gap-8 md:gap-12 justify-center pt-8 border-t border-wist/[.08] w-full max-w-2xl">
        <Stat value={`${formatGen(platformStats.totalGenDistributed)}`} label="GEN Distributed" />
        <Stat value={String(platformStats.totalContributors)} label="Contributors" />
        <Stat value={String(platformStats.totalBounties)} label="Bounties" />
        <Stat value={String(platformStats.activeBounties)} label="Open Now" />
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="font-mono text-2xl font-medium text-gradient">{value}</div>
      <div className="font-mono text-[.58rem] uppercase tracking-[.14em] text-t3 mt-1">
        {label}
      </div>
    </div>
  );
}
