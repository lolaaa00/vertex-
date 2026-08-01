"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { VERTEX_CONTRACT_ADDRESS, ensureStudioNetwork, getGenlayerWriteClient } from "@/lib/genlayer";
import { extractErrorMessage } from "@/lib/errors";

export function SubmissionForm({ chainBountyId }: { chainBountyId: number | null }) {
  const { address, isConnected } = useAccount();
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!isConnected || !address) {
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (chainBountyId == null) {
      setError("This bounty hasn't finished syncing from chain yet — try again shortly.");
      return;
    }
    if (!VERTEX_CONTRACT_ADDRESS) {
      setError("Contract address is not configured (NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS).");
      return;
    }

    setStatus("pending");
    try {
      await ensureStudioNetwork();
      const client = getGenlayerWriteClient(address as `0x${string}`);

      await client.writeContract({
        address: VERTEX_CONTRACT_ADDRESS as `0x${string}`,
        functionName: "submit_solution",
        args: [chainBountyId, evidenceUrl.trim(), summary.trim()],
        value: BigInt(0),
      });

      setStatus("success");
    } catch (err) {
      setStatus("error");
      // eslint-disable-next-line no-console
      console.error("[SubmissionForm] submit_solution failed:", err);
      setError(extractErrorMessage(err));
    }
  }

  if (status === "success") {
    return (
      <GlassCard className="p-6 text-center">
        <h3 className="font-display text-base font-semibold text-vgreen2 mb-2">
          Submission recorded on-chain
        </h3>
        <p className="text-sm text-t2">
          It can take up to a minute for the sync-chain-state cron job to mirror this into the
          bounty&apos;s submission list.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <h3 className="font-display text-base font-semibold text-t1 mb-4">
        Submit Your Solution
      </h3>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
        <Button type="submit" disabled={status === "pending"} className="self-start">
          {status === "pending" ? "Confirm in wallet..." : "Submit Solution"}
        </Button>
        {error && (
          <p role="alert" className="text-xs text-rose font-mono">
            {error}
          </p>
        )}
      </form>
    </GlassCard>
  );
}
