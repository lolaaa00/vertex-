"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/states/EmptyState";

export default function SettingsPage() {
  const { isConnected } = useAccount();
  const [displayName, setDisplayName] = useState("");
  const [linked, setLinked] = useState({ github: true, x: false });
  const [prefs, setPrefs] = useState({
    submissionActivity: true,
    evaluationComplete: true,
    rewardSettled: true,
    marketing: false,
  });

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto">
        <EmptyState
          title="Connect your wallet to manage settings"
          message="Profile and notification preferences are tied to your wallet-authenticated account."
          action={<ConnectButton />}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-8">
      <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
        <span className="text-gradient">Settings</span>
      </h1>

      <GlassCard className="p-6">
        <h2 className="font-display text-base font-semibold text-t1 mb-4">Profile</h2>
        <div className="flex items-center gap-4 mb-5">
          <div
            className="h-14 w-14 rounded-2xl grid place-items-center font-display text-lg font-bold bg-maj/10 border border-maj/30 text-wist"
            aria-hidden="true"
          >
            {displayName ? displayName[0].toUpperCase() : "?"}
          </div>
          <Button variant="ghost" onClick={() => { /* TODO: wire to Supabase Storage avatar upload */ }}>
            Upload Avatar
          </Button>
        </div>
        <label htmlFor="display-name" className="block font-mono text-[.62rem] uppercase tracking-[.14em] text-t3 mb-1.5">
          Display Name
        </label>
        <input
          id="display-name"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Alice"
          className="w-full rounded-lg border border-wist/15 bg-prus/60 px-3.5 py-2.5 text-sm text-t1 placeholder:text-t3 outline-none focus:border-maj focus-visible:outline focus-visible:outline-2 focus-visible:outline-wist"
        />
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="font-display text-base font-semibold text-t1 mb-4">Linked Socials</h2>
        <div className="flex flex-col gap-3">
          <LinkedRow
            label="GitHub"
            linked={linked.github}
            onToggle={() => setLinked((l) => ({ ...l, github: !l.github }))}
          />
          <LinkedRow
            label="X (Twitter)"
            linked={linked.x}
            onToggle={() => setLinked((l) => ({ ...l, x: !l.x }))}
          />
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="font-display text-base font-semibold text-t1 mb-4">
          Notification Preferences
        </h2>
        <div className="flex flex-col gap-3">
          <PrefRow
            label="Submission activity on my bounties"
            checked={prefs.submissionActivity}
            onToggle={() => setPrefs((p) => ({ ...p, submissionActivity: !p.submissionActivity }))}
          />
          <PrefRow
            label="Evaluation complete"
            checked={prefs.evaluationComplete}
            onToggle={() => setPrefs((p) => ({ ...p, evaluationComplete: !p.evaluationComplete }))}
          />
          <PrefRow
            label="Reward settled to my wallet"
            checked={prefs.rewardSettled}
            onToggle={() => setPrefs((p) => ({ ...p, rewardSettled: !p.rewardSettled }))}
          />
          <PrefRow
            label="Product updates & marketing"
            checked={prefs.marketing}
            onToggle={() => setPrefs((p) => ({ ...p, marketing: !p.marketing }))}
          />
        </div>
      </GlassCard>

      <Button className="self-start" onClick={() => { /* TODO: wire to Supabase profile update */ }}>
        Save Changes
      </Button>
    </div>
  );
}

function LinkedRow({ label, linked, onToggle }: { label: string; linked: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-wist/10 px-4 py-3">
      <span className="text-sm text-t1">{label}</span>
      {linked ? (
        <Button variant="ghost" className="!px-4 !py-1.5 text-xs" onClick={onToggle}>
          Unlink
        </Button>
      ) : (
        <Button className="!px-4 !py-1.5 text-xs" onClick={onToggle}>
          Link
        </Button>
      )}
    </div>
  );
}

function PrefRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-wist/10 px-4 py-3 cursor-pointer">
      <span className="text-sm text-t1">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 rounded accent-[#6A4DD4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-wist"
      />
    </label>
  );
}
