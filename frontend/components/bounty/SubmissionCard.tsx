import { GlassCard } from "@/components/ui/GlassCard";
import { CONTRIBUTOR_COLORS, avatarLetterForWallet, colorKeyForWallet } from "@/lib/colors";
import type { Submission } from "@/lib/types";
import { truncateAddress } from "@/lib/utils";

const topLineByKey: Record<string, string> = {
  a: "via-maj",
  b: "via-cyan",
  c: "via-vgreen",
  d: "via-amber",
  e: "via-rose",
};

export function SubmissionCard({ submission }: { submission: Submission }) {
  const colorKey = colorKeyForWallet(submission.contributorWallet);
  const colors = CONTRIBUTOR_COLORS[colorKey];

  return (
    <GlassCard
      className="p-6"
      topLineClassName={`opacity-80 group-hover:opacity-80 ${topLineByKey[colorKey]}`}
    >
      <div className="flex items-center gap-3.5 mb-4">
        <div
          className={`h-10 w-10 rounded-xl grid place-items-center font-display text-[.8125rem] font-bold shrink-0 border ${colors.bg} ${colors.border} ${colors.text}`}
          aria-hidden="true"
        >
          {avatarLetterForWallet(submission.contributorWallet)}
        </div>
        <div>
          <div className="font-mono text-xs text-t3">{truncateAddress(submission.contributorWallet, 6)}</div>
        </div>
      </div>
      {submission.evidenceUrl && (
        <a
          href={submission.evidenceUrl}
          target="_blank"
          rel="noreferrer"
          className="block font-mono text-[.65rem] text-wist underline decoration-wist/40 underline-offset-4 hover:text-alice mb-2 truncate"
        >
          {submission.evidenceUrl}
        </a>
      )}
      <p className="text-[.8125rem] text-t2 leading-relaxed">{submission.summary}</p>
    </GlassCard>
  );
}
