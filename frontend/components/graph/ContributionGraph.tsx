"use client";

import { useEffect, useRef, useState } from "react";
import { CONTRIBUTOR_COLORS, type ContributionGraphNode } from "@/lib/mockData";

const strokeByKey: Record<string, string> = {
  a: "rgba(106,77,212,.35)",
  b: "rgba(103,232,249,.28)",
  c: "rgba(52,211,153,.28)",
  d: "rgba(251,191,36,.25)",
  e: "rgba(251,113,133,.22)",
};

const pctColorByKey: Record<string, string> = {
  a: "#A4A7E3",
  b: "#67E8F9",
  c: "#34D399",
  d: "#FBBF24",
  e: "#FB7185",
};

// Fixed radial layout positions in a 1100x520 viewBox, mirroring the
// prototype's hand-placed node coordinates. Scales responsively via the SVG
// viewBox + percentage-based node positioning.
const positions = [
  { x: 10.5, y: 17.3 }, // top-left
  { x: 89.5, y: 17.3 }, // top-right
  { x: 9.5, y: 82.7 }, // bottom-left
  { x: 90.5, y: 82.7 }, // bottom-right
  { x: 50, y: 11.5 }, // top-center
];

export function ContributionGraph({ nodes }: { nodes: ContributionGraphNode[] }) {
  const [built, setBuilt] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mql.matches);
    const t = setTimeout(() => setBuilt(true), reduceMotion ? 0 : 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="relative w-full h-[min(520px,60vh)] rounded-3xl border border-wist/10 bg-prus2/45 backdrop-blur-xl overflow-hidden mb-8"
      role="img"
      aria-label={`Contribution graph: ${nodes
        .map((n) => `${n.contributor.name} contributed ${n.pct}% in ${n.contributor.category}`)
        .join(", ")}, all merged into the final solution.`}
    >
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-maj to-vel motion-safe:animate-shimmer bg-[length:200%_auto]" aria-hidden="true" />

      <svg viewBox="0 0 1100 520" className="absolute inset-0 z-[1] w-full h-full" aria-hidden="true">
        {nodes.map((n, i) => {
          const pos = positions[i % positions.length];
          const x1 = (pos.x / 100) * 1100;
          const y1 = (pos.y / 100) * 520;
          return (
            <line
              key={n.contributor.id}
              x1={x1}
              y1={y1}
              x2={550}
              y2={260}
              stroke={strokeByKey[n.contributor.colorKey]}
              strokeWidth={Math.max(1.5, (5 - i) * 0.8)}
              className="transition-opacity duration-700"
              style={{ opacity: built ? 1 : 0 }}
            />
          );
        })}
      </svg>

      {/* Merged solution node */}
      <div
        className="absolute z-[6] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90px] h-[90px] rounded-3xl border border-wist/35 grid place-items-center transition-opacity duration-1000"
        style={{
          opacity: built ? 1 : 0,
          background: "linear-gradient(135deg, rgba(106,77,212,.2), rgba(110,51,119,.12))",
          boxShadow: "0 0 50px rgba(106,77,212,.3), 0 0 120px rgba(110,51,119,.12)",
        }}
      >
        <span className="font-mono text-[.48rem] uppercase tracking-[.18em] text-wist text-center leading-tight">
          Merged
          <br />
          Solution
        </span>
      </div>

      {nodes.map((n, i) => {
        const pos = positions[i % positions.length];
        const colors = CONTRIBUTOR_COLORS[n.contributor.colorKey];
        const delay = reduceMotion ? 0 : 500 + i * 250;
        return (
          <div
            key={n.contributor.id}
            className="absolute z-[5] min-w-[140px] rounded-2xl border border-wist/[.12] bg-prus/[.88] backdrop-blur-md text-center px-5 py-4 transition-all"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: `translate(-50%, -50%) scale(${built ? 1 : 0.5})`,
              opacity: built ? 1 : 0,
              transitionDuration: "600ms",
              transitionDelay: `${delay}ms`,
              transitionTimingFunction: "cubic-bezier(.16,1,.3,1)",
            }}
          >
            <div
              className={`h-9 w-9 rounded-[10px] grid place-items-center font-display text-xs font-bold mx-auto mb-2 border ${colors.bg} ${colors.border} ${colors.text}`}
              aria-hidden="true"
            >
              {n.contributor.avatarLetter}
            </div>
            <div className="font-display text-[.8125rem] font-semibold">{n.contributor.name}</div>
            <div className="font-mono text-[.52rem] uppercase tracking-[.1em] text-t3 mb-1">
              {n.contributor.category}
            </div>
            <div className="font-mono text-base font-medium" style={{ color: pctColorByKey[n.contributor.colorKey] }}>
              {n.pct}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
