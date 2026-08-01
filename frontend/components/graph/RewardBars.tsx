import { colorKeyForWallet } from "@/lib/colors";
import type { ContributionGraphEntry } from "@/lib/types";
import { formatGen, truncateAddress } from "@/lib/utils";

const fillByKey: Record<string, string> = {
  a: "#6A4DD4",
  b: "#67E8F9",
  c: "#34D399",
  d: "#FBBF24",
  e: "#FB7185",
};

export function RewardBars({ nodes }: { nodes: ContributionGraphEntry[] }) {
  const pctOf = (n: ContributionGraphEntry) => n.influenceWeightBps / 100;
  const maxPct = Math.max(...nodes.map(pctOf));
  const sorted = [...nodes].sort((a, b) => pctOf(b) - pctOf(a));

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
          const colorKey = colorKeyForWallet(n.contributorWallet);
          const pct = pctOf(n);
          return (
            <div
              key={n.id}
              className="relative overflow-hidden rounded-2xl border border-wist/[.08] bg-prus2/50 backdrop-blur-md p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:border-maj/25"
            >
              <span
                className="absolute inset-x-0 top-0 h-0.5"
                style={{ background: fillByKey[colorKey] }}
                aria-hidden="true"
              />
              <div className="font-mono text-xs font-semibold text-t1">
                {truncateAddress(n.contributorWallet, 4)}
              </div>
              <div className="font-mono text-[.52rem] uppercase tracking-[.1em] text-t3 mb-2">
                {n.category}
              </div>
              <div className="font-mono text-lg font-medium">
                <span style={{ color: fillByKey[colorKey] }}>{formatGen(n.rewardOwedGen)}</span>
              </div>
              <div className="font-mono text-[.6rem] text-t3 mb-2">{pct.toFixed(1)}%</div>
              <div className="h-[3px] rounded-full bg-wist/[.06] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(pct / maxPct) * 100}%`,
                    background: fillByKey[colorKey],
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
