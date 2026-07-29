import { GlassCard } from "@/components/ui/GlassCard";
import { CONTRIBUTOR_COLORS, type Submission } from "@/lib/mockData";
import { truncateAddress } from "@/lib/utils";

const topLineByKey: Record<string, string> = {
  a: "via-maj",
  b: "via-cyan",
  c: "via-vgreen",
  d: "via-amber",
  e: "via-rose",
};

export function SubmissionCard({ submission }: { submission: Submission }) {
  const { contributor } = submission;
  const colors = CONTRIBUTOR_COLORS[contributor.colorKey];

  return (
    <GlassCard
      className="p-6"
      topLineClassName={`opacity-80 group-hover:opacity-80 ${topLineByKey[contributor.colorKey]}`}
    >
      <div className="flex items-center gap-3.5 mb-4">
        <div
          className={`h-10 w-10 rounded-xl grid place-items-center font-display text-[.8125rem] font-bold shrink-0 border ${colors.bg} ${colors.border} ${colors.text}`}
          aria-hidden="true"
        >
          {contributor.avatarLetter}
        </div>
        <div>
          <div className="font-display text-sm font-semibold tracking-tight text-t1">
            {contributor.name}
          </div>
          <div className="font-mono text-[.58rem] text-t3">{truncateAddress(contributor.wallet, 6)}</div>
        </div>
      </div>
      <div
        className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 mb-3 font-mono text-[.62rem] uppercase tracking-[.1em] border ${colors.bg} ${colors.border} ${colors.text}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
        {submission.category}
      </div>
      <p className="text-[.8125rem] text-t2 leading-relaxed">{submission.excerpt}</p>
    </GlassCard>
  );
}
