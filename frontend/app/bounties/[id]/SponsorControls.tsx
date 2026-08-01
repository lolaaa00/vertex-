"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { VERTEX_CONTRACT_ADDRESS, ensureStudioNetwork, getGenlayerWriteClient } from "@/lib/genlayer";
import { extractErrorMessage } from "@/lib/errors";
import type { Bounty } from "@/lib/types";

export function SponsorControls({ bounty }: { bounty: Bounty }) {
  const router = useRouter();
  const { address } = useAccount();
  const [status, setStatus] = useState<"idle" | "pending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"closed" | "evaluated" | null>(null);

  // Sponsor-only gate: in production this should also be verified
  // server-side against the contract's stored sponsor address, not just
  // the connected wallet — this client check is a UX convenience only.
  const isSponsor =
    !!address && address.toLowerCase() === bounty.sponsorWallet.toLowerCase();

  if (bounty.status !== "open" && bounty.status !== "evaluating") return null;

  async function runWrite(functionName: "close_submissions" | "evaluate_bounty") {
    if (bounty.chainBountyId == null) {
      setError("This bounty hasn't finished syncing from chain yet — try again shortly.");
      return;
    }
    if (!VERTEX_CONTRACT_ADDRESS) {
      setError("Contract address is not configured (NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS).");
      return;
    }
    setStatus("pending");
    setError(null);
    try {
      await ensureStudioNetwork();
      const client = getGenlayerWriteClient(address as `0x${string}`);
      await client.writeContract({
        address: VERTEX_CONTRACT_ADDRESS as `0x${string}`,
        functionName,
        args: [bounty.chainBountyId],
        value: BigInt(0),
      });
      setStatus("idle");
      setDone(functionName === "close_submissions" ? "closed" : "evaluated");
      router.refresh();
    } catch (err) {
      setStatus("error");
      // eslint-disable-next-line no-console
      console.error(`[SponsorControls] ${functionName} failed:`, err);
      setError(extractErrorMessage(err));
    }
  }

  return (
    <GlassCard className="p-6">
      <h3 className="font-display text-base font-semibold text-t1 mb-2">
        Sponsor Controls
      </h3>
      <p className="text-sm text-t2 mb-5">
        {bounty.status === "open"
          ? "Closing submissions moves this bounty to EVALUATING and stops new submissions."
          : "Evaluating triggers the GenLayer Intelligent Contract's non-deterministic reasoning pass — fetching real evidence and building the Contribution Graph across every submission. This can take a while (real validator/LLM consensus)."}
      </p>
      {!isSponsor ? (
        <p className="text-xs font-mono text-t3">
          Connect the sponsor wallet ({bounty.sponsorWallet}) to access these controls.
        </p>
      ) : (
        <Button
          variant="ghost"
          className="border-rose/30 hover:border-rose/60"
          disabled={status === "pending"}
          onClick={() =>
            runWrite(bounty.status === "open" ? "close_submissions" : "evaluate_bounty")
          }
        >
          {status === "pending"
            ? "Confirm in wallet..."
            : bounty.status === "open"
              ? "Close Submissions"
              : "Evaluate & Settle"}
        </Button>
      )}
      {done === "closed" && (
        <p role="status" className="mt-3 text-xs text-amber2 font-mono">
          Submissions closed on-chain. Refresh in a minute once sync-chain-state picks it up, then
          come back to Evaluate &amp; Settle.
        </p>
      )}
      {done === "evaluated" && (
        <p role="status" className="mt-3 text-xs text-vgreen2 font-mono">
          Evaluation submitted on-chain. Check the Contribution Graph in a minute once
          sync-chain-state mirrors the result.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-xs text-rose font-mono">
          {error}
        </p>
      )}
    </GlassCard>
  );
}
