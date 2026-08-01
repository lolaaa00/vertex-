"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/states/EmptyState";
import { getBounties, getGenByCategory } from "@/lib/data";

const categoryColors = ["#6A4DD4", "#67E8F9", "#34D399", "#FBBF24", "#FB7185"];

const chartTooltipStyle = {
  background: "rgba(0,2,41,.92)",
  border: "1px solid rgba(164,167,227,.2)",
  borderRadius: 10,
  fontFamily: "var(--font-jetbrains-mono)",
  fontSize: 12,
  color: "#F1F5F9",
};

export default function AnalyticsPage() {
  const [bountiesOverTime, setBountiesOverTime] = useState<{ month: string; bounties: number }[]>(
    []
  );
  const [genByCategory, setGenByCategory] = useState<{ category: string; gen: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getBounties(), getGenByCategory()]).then(([bounties, gen]) => {
      if (cancelled) return;
      const counts = new Map<string, number>();
      for (const b of bounties) {
        const month = new Date(b.createdAt).toLocaleString("en-US", { month: "short" });
        counts.set(month, (counts.get(month) ?? 0) + 1);
      }
      setBountiesOverTime(
        Array.from(counts.entries()).map(([month, count]) => ({ month, bounties: count }))
      );
      setGenByCategory(gen);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-2">
        Platform <span className="text-gradient">Analytics</span>
      </h1>
      <p className="text-t2 mb-8">Platform-wide trends across bounties and GEN distribution.</p>

      <GlassCard className="p-6 mb-6">
        <h2 className="font-display text-base font-semibold text-t1 mb-4">
          Bounties Created Over Time
        </h2>
        {!loading && bountiesOverTime.length === 0 ? (
          <EmptyState title="No bounties yet" message="Chart will populate once bounties are created." />
        ) : (
          <div className="h-64" role="img" aria-label="Line chart showing bounties created per month">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={bountiesOverTime}>
                <CartesianGrid stroke="rgba(164,167,227,.08)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={{ stroke: "rgba(164,167,227,.15)" }} tickLine={false} />
                <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Line type="monotone" dataKey="bounties" stroke="#6A4DD4" strokeWidth={2.5} dot={{ fill: "#A4A7E3", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="font-display text-base font-semibold text-t1 mb-4">
          GEN Distributed by Category
        </h2>
        {!loading && genByCategory.length === 0 ? (
          <EmptyState title="No settled rewards yet" message="Chart will populate once bounties are evaluated and settled." />
        ) : (
          <div className="h-64" role="img" aria-label="Bar chart of GEN distributed per contribution category">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={genByCategory}>
                <CartesianGrid stroke="rgba(164,167,227,.08)" vertical={false} />
                <XAxis dataKey="category" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={{ stroke: "rgba(164,167,227,.15)" }} tickLine={false} />
                <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="gen" radius={[6, 6, 0, 0]}>
                  {genByCategory.map((entry, i) => (
                    <Cell key={entry.category} fill={categoryColors[i % categoryColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
