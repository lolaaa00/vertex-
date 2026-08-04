"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { TransactionProgress } from "@/components/tx/TransactionProgress";
import { VERTEX_CONTRACT_ADDRESS, ensureStudioNetwork } from "@/lib/genlayer";
import { useContractWrite } from "@/lib/useContractWrite";
import { useActiveIdentity } from "@/lib/useActiveIdentity";
import type { Bounty } from "@/lib/types";

export function SponsorControls({ bounty }: { bounty: Bounty }) {
  const router = useRouter();
  const identity = useActiveIdentity();
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"close_submissions" | "evaluate_bounty" | null>(null);
  const { phase, hash, error, settled, execute, reset } = useContractWrite();

  // Sponsor-only gate: in production this should also be verified
  // server-side against the contract's stored sponsor address, not just
  // the active wallet — this client check is a UX convenience only.
  const isSponsor =
    identity.address != null && identity.address.toLowerCase() === bounty.sponsorWallet.toLowerCase();

  useEffect(() => {
    if (settled) router.refresh();
  }, [settled, router]);

  if (bounty.status !== "open" && bounty.status !== "evaluating") return null;

  async function runWrite(functionName: "close_submissions" | "evaluate_bounty") {
    setFormError(null);
    if (bounty.chainBountyId == null) {
      setFormError("This bounty hasn't finished syncing from chain yet — try again shortly.");
      return;
    }
    if (!VERTEX_CONTRACT_ADDRESS) {
      setFormError("Contract address is not configured (NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS).");
      return;
    }
    setPendingAction(functionName);
    if (identity.mode === "injected") await ensureStudioNetwork();
    await execute(identity, {
      address: VERTEX_CONTRACT_ADDRESS as `0x${string}`,
      functionName,
      args: [bounty.chainBountyId],
      value: BigInt(0),
    });
  }

  const busy = phase !== "idle" && phase !== "error" && phase !== "retryable";

  return (
    <GlassCard className="p-6">
      <h3 className="font-display text-base font-semibold text-t1 mb-2">
        Sponsor Controls
      </h3>
      <p className="text-sm text-t2 mb-5">
        {bounty.status === "open"
          ? "Closing submissions moves this bounty to EVALUATING and stops new submissions."
          : "Evaluating triggers the GenLayer Intelligent Contract's non-deterministic reasoning pass — fetching real evidence and building the Contribution Graph across every submission. This runs real validator consensus and can take several minutes; the stages below reflect the real transaction, not a generic spinner."}
      </p>
      {!isSponsor ? (
        <p className="text-xs font-mono text-t3">
          Connect the sponsor wallet ({bounty.sponsorWallet}) to access these controls.
        </p>
      ) : (
        <Button
          variant="ghost"
          className="border-rose/30 hover:border-rose/60"
          disabled={busy}
          onClick={() => runWrite(bounty.status === "open" ? "close_submissions" : "evaluate_bounty")}
        >
          {busy
            ? "Working..."
            : bounty.status === "open"
              ? "Close Submissions"
              : "Evaluate & Settle"}
        </Button>
      )}
      {formError && (
        <p role="alert" className="mt-3 text-xs text-rose font-mono">
          {formError}
        </p>
      )}
      <div className="mt-3">
        <TransactionProgress
          phase={phase}
          hash={hash}
          error={error}
          settled={settled}
          onRetry={() => {
            reset();
            if (pendingAction) runWrite(pendingAction);
          }}
        />
      </div>
      {settled && (
        <p role="status" className="mt-3 text-xs text-vgreen2 font-mono">
          {pendingAction === "close_submissions"
            ? "Submissions closed on-chain. Refresh in a minute once sync-chain-state picks it up, then come back to Evaluate & Settle."
            : "Evaluation settled on-chain. Check the Contribution Graph in a minute once sync-chain-state mirrors the result."}
        </p>
      )}
    </GlassCard>
  );
}
