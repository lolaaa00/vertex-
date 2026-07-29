"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";

export function SubmissionForm({ bountyId }: { bountyId: string }) {
  const { isConnected } = useAccount();
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!isConnected) {
    return (
      <GlassCard className="p-6 text-center">
        <h3 className="font-display text-base font-semibold text-t1 mb-2">
          Connect a wallet to submit
        </h3>
        <p className="text-sm text-t2 mb-5">
          Submissions are attributed to your connected wallet address.
        </p>
        <div className="flex justify-center">
          <ConnectButton />
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <h3 className="font-display text-base font-semibold text-t1 mb-4">
        Submit Your Solution
      </h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          // TODO: wire to Supabase Edge Function -> GenLayer contract write
          // (submit_solution) for bounty `bountyId`, keyed to the connected
          // wallet address from wagmi's useAccount().
          setSubmitted(true);
        }}
        className="flex flex-col gap-4"
      >
        <div>
          <label htmlFor="evidence-url" className="block font-mono text-[.62rem] uppercase tracking-[.14em] text-t3 mb-1.5">
            Evidence URL
          </label>
          <input
            id="evidence-url"
            type="url"
            required
            placeholder="https://github.com/you/submission"
            value={evidenceUrl}
            onChange={(e) => setEvidenceUrl(e.target.value)}
            className="w-full rounded-lg border border-wist/15 bg-prus/60 px-3.5 py-2.5 text-sm text-t1 placeholder:text-t3 outline-none transition-colors focus:border-maj focus-visible:outline focus-visible:outline-2 focus-visible:outline-wist"
          />
        </div>
        <div>
          <label htmlFor="summary" className="block font-mono text-[.62rem] uppercase tracking-[.14em] text-t3 mb-1.5">
            Summary
          </label>
          <textarea
            id="summary"
            required
            rows={4}
            placeholder="Describe your contribution and why it addresses the bounty's evaluation criteria..."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="w-full rounded-lg border border-wist/15 bg-prus/60 px-3.5 py-2.5 text-sm text-t1 placeholder:text-t3 outline-none transition-colors focus:border-maj resize-y focus-visible:outline focus-visible:outline-2 focus-visible:outline-wist"
          />
        </div>
        <Button type="submit" className="self-start">
          Submit Solution
        </Button>
        {submitted && (
          <p role="status" className="text-xs text-vgreen2 font-mono">
            Recorded locally — TODO: this will call the GenLayer contract once wired.
          </p>
        )}
      </form>
    </GlassCard>
  );
}
