import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/ui/Badge";
import { GlassCard } from "@/components/ui/GlassCard";
import { ButtonLink } from "@/components/ui/Button";
import { SubmissionCard } from "@/components/bounty/SubmissionCard";
import { SubmissionForm } from "@/components/bounty/SubmissionForm";
import { EmptyState } from "@/components/states/EmptyState";
import { SponsorControls } from "@/app/bounties/[id]/SponsorControls";
import { getBounty, getSubmissionsForBounty } from "@/lib/data";
import { formatGen } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BountyDetailPage({ params }: { params: { id: string } }) {
  const bounty = await getBounty(params.id);
  if (!bounty) notFound();

  const bountySubmissions = await getSubmissionsForBounty(bounty.id);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <StatusBadge status={bounty.status} />
        <span className="font-mono text-sm font-medium text-alice bg-wist/[.06] border border-wist/15 px-3.5 py-1.5 rounded-lg">
          {formatGen(bounty.rewardPoolGen)} GEN
        </span>
        {bounty.status === "settled" && (
          <Link
            href={`/bounties/${bounty.id}/graph`}
            className="font-mono text-[.65rem] uppercase tracking-[.14em] text-wist underline decoration-wist/40 underline-offset-4 hover:text-alice focus-visible:outline focus-visible:outline-2 focus-visible:outline-wist"
          >
            View Contribution Graph &#8594;
          </Link>
        )}
      </div>

      <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-3">
        {bounty.title}
      </h1>
      <p className="text-t2 leading-relaxed max-w-2xl mb-8">{bounty.description}</p>

      <GlassCard className="p-6 mb-10">
        <h2 className="font-display text-base font-semibold text-t1 mb-3">
          Evaluation Criteria
        </h2>
        <ul className="grid sm:grid-cols-2 gap-2.5">
          {bounty.evaluationCriteria.map((c) => (
            <li key={c} className="flex items-start gap-2.5 text-sm text-t2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-maj/70 shrink-0" aria-hidden="true" />
              {c}
            </li>
          ))}
        </ul>
      </GlassCard>

      <div className="flex items-center gap-2 mb-4">
        <span className="font-mono text-[.58rem] uppercase tracking-[.2em] text-t3">
          Submissions ({bountySubmissions.length})
        </span>
        <span className="flex-1 h-px bg-gradient-to-r from-wist/[.12] to-transparent" aria-hidden="true" />
      </div>

      {bountySubmissions.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          message="Be the first to submit a solution to this bounty."
          action={
            <ButtonLink href="#submit" variant="ghost">
              Submit a solution
            </ButtonLink>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {bountySubmissions.map((s) => (
            <SubmissionCard key={s.id} submission={s} />
          ))}
        </div>
      )}

      <div id="submit" className="grid md:grid-cols-2 gap-6">
        {bounty.status === "open" && <SubmissionForm chainBountyId={bounty.chainBountyId} />}
        <SponsorControls bounty={bounty} />
      </div>
    </div>
  );
}
