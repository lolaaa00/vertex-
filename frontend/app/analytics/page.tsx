"use client";

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

// TODO: wire to Supabase (aggregate views over bounties/submissions/reward
// ledger tables) — mock series below approximate plausible platform growth.
const bountiesOverTime = [
  { month: "Feb", bounties: 1 },
  { month: "Mar", bounties: 2 },
  { month: "Apr", bounties: 4 },
  { month: "May", bounties: 6 },
  { month: "Jun", bounties: 9 },
  { month: "Jul", bounties: 13 },
];

const genByCategory = [
  { category: "Security", gen: 14250, color: "#6A4DD4" },
  { category: "UI/UX", gen: 9500, color: "#67E8F9" },
  { category: "Performance", gen: 11875, color: "#34D399" },
  { category: "Recovery", gen: 4750, color: "#FBBF24" },
  { category: "Docs", gen: 2375, color: "#FB7185" },
];

const chartTooltipStyle = {
  background: "rgba(0,2,41,.92)",
  border: "1px solid rgba(164,167,227,.2)",
  borderRadius: 10,
  fontFamily: "var(--font-jetbrains-mono)",
  fontSize: 12,
  color: "#F1F5F9",
};

export default function AnalyticsPage() {
  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-2">
        Platform <span className="text-gradient">Analytics</span>
      </h1>
      <p className="text-t2 mb-8">
        Platform-wide trends across bounties and GEN distribution. Mock data
        until Supabase aggregation views are wired up.
      </p>

      <GlassCard className="p-6 mb-6">
        <h2 className="font-display text-base font-semibold text-t1 mb-4">
          Bounties Created Over Time
        </h2>
        <div className="h-64" role="img" aria-label="Line chart showing bounties created growing from 1 in February to 13 in July">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={bountiesOverTime}>
              <CartesianGrid stroke="rgba(164,167,227,.08)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={{ stroke: "rgba(164,167,227,.15)" }} tickLine={false} />
              <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Line type="monotone" dataKey="bounties" stroke="#6A4DD4" strokeWidth={2.5} dot={{ fill: "#A4A7E3", r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="font-display text-base font-semibold text-t1 mb-4">
          GEN Distributed by Category
        </h2>
        <div className="h-64" role="img" aria-label="Bar chart of GEN distributed per contribution category">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={genByCategory}>
              <CartesianGrid stroke="rgba(164,167,227,.08)" vertical={false} />
              <XAxis dataKey="category" tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={{ stroke: "rgba(164,167,227,.15)" }} tickLine={false} />
              <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Bar dataKey="gen" radius={[6, 6, 0, 0]}>
                {genByCategory.map((entry) => (
                  <Cell key={entry.category} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    </div>
  );
}
