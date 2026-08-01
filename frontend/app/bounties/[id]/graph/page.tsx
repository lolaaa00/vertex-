import { notFound } from "next/navigation";
import { ContributionGraph } from "@/components/graph/ContributionGraph";
import { RewardBars } from "@/components/graph/RewardBars";
import { TxFooterStrip } from "@/components/graph/TxFooterStrip";
import { EmptyState } from "@/components/states/EmptyState";
import { getBounty, getContributionGraphForBounty } from "@/lib/data";
import { VERTEX_CONTRACT_ADDRESS } from "@/lib/genlayer";
import { truncateAddress } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ContributionGraphPage({ params }: { params: { id: string } }) {
  const bounty = await getBounty(params.id);
  if (!bounty) notFound();

  const graphNodes = await getContributionGraphForBounty(bounty.id);
  const settledEntry = graphNodes.find((n) => n.txHashSettled);
  const settlementDetails = {
    settlementTx: settledEntry?.txHashSettled ?? "Pending",
    block: "GenLayer StudioNet",
    contract: truncateAddress(VERTEX_CONTRACT_ADDRESS || "Not configured", 6),
    consensus: settledEntry ? "GenLayer validator consensus" : "Not yet evaluated",
  };

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
          {settledEntry && <TxFooterStrip {...settlementDetails} />}
        </>
      )}
    </div>
  );
}
