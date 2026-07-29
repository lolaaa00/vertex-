import { CONTRIBUTOR_COLORS, type ContributionGraphNode } from "@/lib/mockData";
import { formatGen } from "@/lib/utils";

const fillByKey: Record<string, string> = {
  a: "#6A4DD4",
  b: "#67E8F9",
  c: "#34D399",
  d: "#FBBF24",
  e: "#FB7185",
};

export function RewardBars({ nodes }: { nodes: ContributionGraphNode[] }) {
  const maxPct = Math.max(...nodes.map((n) => n.pct));
  const sorted = [...nodes].sort((a, b) => b.pct - a.pct);

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="font-mono text-[.58rem] uppercase tracking-[.2em] text-t3">
          Reward Distribution
        </span>
        <span className="flex-1 h-px bg-gradient-to-r from-wist/[.12] to-transparent" aria-hidden="true" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
        {sorted.map((n) => {
          const colors = CONTRIBUTOR_COLORS[n.contributor.colorKey];
          return (
            <div
              key={n.contributor.id}
              className="relative overflow-hidden rounded-2xl border border-wist/[.08] bg-prus2/50 backdrop-blur-md p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-maj/25"
            >
              <span
                className="absolute inset-x-0 top-0 h-0.5"
                style={{ background: fillByKey[n.contributor.colorKey] }}
                aria-hidden="true"
              />
              <div className="font-display text-[.8125rem] font-semibold text-t1">
                {n.contributor.name}
              </div>
              <div className="font-mono text-[.52rem] uppercase tracking-[.1em] text-t3 mb-2">
                {n.contributor.category}
              </div>
              <div className="font-mono text-lg font-medium" style={{ color: colors.text ? undefined : undefined }}>
                <span style={{ color: fillByKey[n.contributor.colorKey] }}>
                  {formatGen(n.rewardGen)}
                </span>
              </div>
              <div className="font-mono text-[.6rem] text-t3 mb-2">{n.pct}%</div>
              <div className="h-[3px] rounded-full bg-wist/[.06] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(n.pct / maxPct) * 100}%`,
                    background: fillByKey[n.contributor.colorKey],
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
