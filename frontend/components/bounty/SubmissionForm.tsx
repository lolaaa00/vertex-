"use client";

import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { TransactionProgress } from "@/components/tx/TransactionProgress";
import { GeneratedWalletPanel } from "@/components/wallet/GeneratedWalletPanel";
import { VERTEX_CONTRACT_ADDRESS, ensureStudioNetwork } from "@/lib/genlayer";
import { useContractWrite } from "@/lib/useContractWrite";
import { useActiveIdentity } from "@/lib/useActiveIdentity";

export function SubmissionForm({ chainBountyId }: { chainBountyId: number | null }) {
  const identity = useActiveIdentity();
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const { phase, hash, error, settled, execute, reset } = useContractWrite();

  if (identity.mode === "none") {
    return (
      <div className="flex flex-col gap-4">
        <GlassCard className="p-6 text-center">
          <h3 className="font-display text-base font-semibold text-t1 mb-2">
            Connect a wallet to submit
          </h3>
          <p className="text-sm text-t2 mb-5">
            Submissions are attributed to your active wallet address.
          </p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </GlassCard>
        <GeneratedWalletPanel identity={identity} compact />
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (chainBountyId == null) {
      setFormError("This bounty hasn't finished syncing from chain yet — try again shortly.");
      return;
    }
    if (!VERTEX_CONTRACT_ADDRESS) {
      setFormError("Contract address is not configured (NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS).");
      return;
    }

    if (identity.mode === "injected") await ensureStudioNetwork();
    await execute(identity, {
      address: VERTEX_CONTRACT_ADDRESS as `0x${string}`,
      functionName: "submit_solution",
      args: [chainBountyId, evidenceUrl.trim(), summary.trim()],
      value: BigInt(0),
    });
  }

  if (settled) {
    return (
      <GlassCard className="p-6 text-center">
        <h3 className="font-display text-base font-semibold text-vgreen2 mb-2">
          Submission recorded on-chain
        </h3>
        <p className="text-sm text-t2 mb-3">
          It can take up to a minute for the sync-chain-state cron job to mirror this into the
          bounty&apos;s submission list.
        </p>
        {hash && <p className="font-mono text-[.65rem] text-t3 break-all">{hash}</p>}
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <h3 className="font-display text-base font-semibold text-t1 mb-4">
        Submit Your Solution
      </h3>
      <form id="submission-form" onSubmit={onSubmit} className="flex flex-col gap-4">
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
        <Button
          type="submit"
          disabled={phase !== "idle" && phase !== "error" && phase !== "retryable"}
          className="self-start"
        >
          {phase === "idle" || phase === "error" || phase === "retryable" ? "Submit Solution" : "Working..."}
        </Button>
        {formError && (
          <p role="alert" className="text-xs text-rose font-mono">
            {formError}
          </p>
        )}
        <TransactionProgress
          phase={phase}
          hash={hash}
          error={error}
          settled={settled}
          onRetry={() => {
            reset();
            const form = document.getElementById("submission-form") as HTMLFormElement | null;
            form?.requestSubmit();
          }}
        />
      </form>
    </GlassCard>
  );
}
