import { notFound } from "next/navigation";
import { ContributionGraph } from "@/components/graph/ContributionGraph";
import { RewardBars } from "@/components/graph/RewardBars";
import { TxFooterStrip } from "@/components/graph/TxFooterStrip";
import { EmptyState } from "@/components/states/EmptyState";
import { bounties, contributionGraph, settlementDetails } from "@/lib/mockData";

export function generateStaticParams() {
  return bounties.map((b) => ({ id: b.id }));
}

export default function ContributionGraphPage({ params }: { params: { id: string } }) {
  const bounty = bounties.find((b) => b.id === params.id);
  if (!bounty) notFound();

  // TODO: wire to lib/genlayer.ts getBountyOnChainState(bounty.id) — falling
  // back to mock data until the contract address is set. Only did-platform
  // has a completed evaluation in this mock dataset.
  const graphNodes = bounty.id === "did-platform" ? contributionGraph : [];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-1.5">
          Contribution <span className="text-gradient">Graph</span>
        </h1>
        <p className="text-t2 text-sm">
          {graphNodes.length > 0
            ? `GenLayer reasoned across all ${graphNodes.length} submissions and built this attribution for "${bounty.title}".`
            : `Evaluation for "${bounty.title}" has not completed yet.`}
        </p>
      </div>

      {graphNodes.length === 0 ? (
        <EmptyState
          title="No contribution graph yet"
          message="This bounty's submissions haven't been evaluated by the GenLayer contract yet. Check back once the sponsor closes submissions and evaluation completes."
        />
      ) : (
        <>
          <ContributionGraph nodes={graphNodes} />
          <RewardBars nodes={graphNodes} />
          <TxFooterStrip {...settlementDetails} />
        </>
      )}
    </div>
  );
}
