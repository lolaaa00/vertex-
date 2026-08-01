"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import type { Bounty } from "@/lib/types";

export function SponsorControls({ bounty }: { bounty: Bounty }) {
  const { address } = useAccount();
  const [triggered, setTriggered] = useState(false);

  // Sponsor-only gate: in production this should also be verified
  // server-side against the contract's stored sponsor address, not just
  // the connected wallet — this client check is a UX convenience only.
  const isSponsor =
    !!address && address.toLowerCase() === bounty.sponsorWallet.toLowerCase();

  if (bounty.status !== "open") return null;

  return (
    <GlassCard className="p-6">
      <h3 className="font-display text-base font-semibold text-t1 mb-2">
        Sponsor Controls
      </h3>
      <p className="text-sm text-t2 mb-5">
        Closing submissions triggers the GenLayer Intelligent Contract&apos;s
        evaluation pass across every submission for this bounty.
      </p>
      {!isSponsor ? (
        <p className="text-xs font-mono text-t3">
          Connect the sponsor wallet ({bounty.sponsorWallet}) to access
          evaluation controls.
        </p>
      ) : (
        <Button
          variant="ghost"
          className="border-rose/30 hover:border-rose/60"
          onClick={() => {
            // TODO: wire to GenLayer contract write `close_and_evaluate`
            // (see lib/genlayer.ts) once the contract address is set.
            setTriggered(true);
          }}
        >
          Close Submissions & Evaluate
        </Button>
      )}
      {triggered && (
        <p role="status" className="mt-3 text-xs text-amber2 font-mono">
          Queued locally — TODO: wire to the deployed contract&apos;s evaluation
          entrypoint.
        </p>
      )}
    </GlassCard>
  );
}
