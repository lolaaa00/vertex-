"use client";

import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/states/EmptyState";
import { StatusBadge } from "@/components/ui/Badge";
import { bounties, submissions, contributionGraph } from "@/lib/mockData";
import { formatGen } from "@/lib/utils";

export default function DashboardPage() {
  const { isConnected } = useAccount();

  // TODO: wire to Supabase — filter bounties/submissions/rewards by the
  // connected wallet's linked profile rather than showing the full mock set.
  const sponsored = bounties.slice(0, 2);
  const mySubmissions = submissions.slice(0, 2);
  const totalEarned = contributionGraph.reduce((sum, n) => sum + n.rewardGen, 0);

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto">
        <EmptyState
          title="Connect your wallet to view your dashboard"
          message="Your sponsored bounties, submissions, and rewards are tied to your connected wallet address."
          action={<ConnectButton />}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-8">
        Your <span className="text-gradient">Dashboard</span>
      </h1>

      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <GlassCard className="p-6 text-center">
          <div className="font-mono text-2xl text-gradient font-medium">{sponsored.length}</div>
          <div className="font-mono text-[.6rem] uppercase tracking-[.14em] text-t3 mt-1">
            Bounties Sponsored
          </div>
        </GlassCard>
        <GlassCard className="p-6 text-center">
          <div className="font-mono text-2xl text-gradient font-medium">{mySubmissions.length}</div>
          <div className="font-mono text-[.6rem] uppercase tracking-[.14em] text-t3 mt-1">
            Submissions Made
          </div>
        </GlassCard>
        <GlassCard className="p-6 text-center">
          <div className="font-mono text-2xl text-gradient font-medium">
            {formatGen(totalEarned)}
          </div>
          <div className="font-mono text-[.6rem] uppercase tracking-[.14em] text-t3 mt-1">
            GEN Earned
          </div>
        </GlassCard>
      </div>

      <Section title="Bounties You Sponsored">
        <div className="grid sm:grid-cols-2 gap-4">
          {sponsored.map((b) => (
            <GlassCard key={b.id} className="p-5">
              <div className="flex items-center justify-between mb-2">
                <StatusBadge status={b.status} />
                <span className="font-mono text-xs text-t2">{formatGen(b.prizeGen)} GEN</span>
              </div>
              <h3 className="font-display text-sm font-semibold text-t1">{b.title}</h3>
            </GlassCard>
          ))}
        </div>
      </Section>

      <Section title="Your Submissions">
        <div className="grid sm:grid-cols-2 gap-4">
          {mySubmissions.map((s) => (
            <GlassCard key={s.id} className="p-5">
              <div className="font-mono text-[.6rem] uppercase tracking-[.1em] text-wist mb-1.5">
                {s.category}
              </div>
              <h3 className="font-display text-sm font-semibold text-t1">{s.excerpt}</h3>
            </GlassCard>
          ))}
        </div>
      </Section>

      <Section title="Notifications">
        <GlassCard className="p-5">
          <p className="text-sm text-t2">
            2 unread notifications — see the bell icon in the navigation bar.
          </p>
        </GlassCard>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <span className="font-mono text-[.58rem] uppercase tracking-[.2em] text-t3">{title}</span>
        <span className="flex-1 h-px bg-gradient-to-r from-wist/[.12] to-transparent" />
      </div>
      {children}
    </div>
  );
}
