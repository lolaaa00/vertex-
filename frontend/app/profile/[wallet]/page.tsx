import { notFound } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/states/EmptyState";
import { CONTRIBUTOR_COLORS, contributionGraph, contributors, submissions } from "@/lib/mockData";
import { formatGen, truncateAddress } from "@/lib/utils";

export function generateStaticParams() {
  return contributors.map((c) => ({ wallet: c.wallet }));
}

export default function ProfilePage({ params }: { params: { wallet: string } }) {
  const contributor = contributors.find(
    (c) => c.wallet.toLowerCase() === decodeURIComponent(params.wallet).toLowerCase()
  );
  if (!contributor) notFound();

  const colors = CONTRIBUTOR_COLORS[contributor.colorKey];
  const mySubmissions = submissions.filter((s) => s.contributor.id === contributor.id);
  const myGraphEntries = contributionGraph.filter((n) => n.contributor.id === contributor.id);
  const totalEarned = myGraphEntries.reduce((sum, n) => sum + n.rewardGen, 0);

  // Categories the contributor "excels in", derived from past
  // contribution-graph entries. TODO: wire to a real aggregation across all
  // of this contributor's settled contribution-graph rows once Supabase +
  // the GenLayer contract are live — this only reflects the mock dataset.
  const categories = Array.from(new Set(myGraphEntries.map((n) => n.contributor.category)));

  return (
    <div className="max-w-3xl mx-auto">
      <GlassCard className="p-7 mb-8">
        <div className="flex items-center gap-4 flex-wrap">
          <div
            className={`h-16 w-16 rounded-2xl grid place-items-center font-display text-xl font-bold border shrink-0 ${colors.bg} ${colors.border} ${colors.text}`}
            aria-hidden="true"
          >
            {contributor.avatarLetter}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-t1">
              {contributor.name}
            </h1>
            <p className="font-mono text-xs text-t3">{truncateAddress(contributor.wallet, 6)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-5">
          {contributor.githubHandle && (
            <span className="font-mono text-[.65rem] rounded-full border border-wist/20 bg-wist/[.05] px-3 py-1 text-t2">
              GitHub · {contributor.githubHandle}
            </span>
          )}
          {contributor.xHandle && (
            <span className="font-mono text-[.65rem] rounded-full border border-wist/20 bg-wist/[.05] px-3 py-1 text-t2">
              X · @{contributor.xHandle}
            </span>
          )}
          {!contributor.githubHandle && !contributor.xHandle && (
            <span className="font-mono text-[.65rem] text-t3">No linked socials.</span>
          )}
        </div>
      </GlassCard>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <GlassCard className="p-6 text-center">
          <div className="font-mono text-2xl text-gradient font-medium">
            {formatGen(totalEarned)}
          </div>
          <div className="font-mono text-[.58rem] uppercase tracking-[.14em] text-t3 mt-1">
            Total GEN Earned
          </div>
        </GlassCard>
        <GlassCard className="p-6 text-center">
          <div className="font-mono text-2xl text-gradient font-medium">{mySubmissions.length}</div>
          <div className="font-mono text-[.58rem] uppercase tracking-[.14em] text-t3 mt-1">
            Submissions
          </div>
        </GlassCard>
      </div>

      <Section title="Categories of Strength">
        {categories.length === 0 ? (
          <EmptyState title="No settled contributions yet" message="This contributor has no evaluated contribution-graph entries yet." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <span
                key={c}
                className="font-mono text-xs rounded-full border border-maj/25 bg-maj/[.08] px-3.5 py-1.5 text-wist"
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </Section>

      <Section title="Submission History">
        {mySubmissions.length === 0 ? (
          <EmptyState title="No submissions yet" message="This contributor hasn't submitted to any bounty yet." />
        ) : (
          <div className="flex flex-col gap-2">
            {mySubmissions.map((s) => (
              <GlassCard key={s.id} className="p-4">
                <div className="font-mono text-[.6rem] uppercase tracking-[.1em] text-wist mb-1">
                  {s.category}
                </div>
                <p className="text-sm text-t2">{s.excerpt}</p>
              </GlassCard>
            ))}
          </div>
        )}
      </Section>
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
