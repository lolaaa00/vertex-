"use client";

import { TransactionStatus } from "genlayer-js/types";
import type { WritePhase } from "@/lib/useContractWrite";
import { classifyError } from "@/lib/errors";

const STAGE_LABELS: Partial<Record<TransactionStatus, string>> = {
  [TransactionStatus.PENDING]: "Submitted — waiting for a leader to be assigned",
  [TransactionStatus.PROPOSING]: "Leader proposing a result",
  [TransactionStatus.COMMITTING]: "Validators committing votes",
  [TransactionStatus.REVEALING]: "Validators revealing votes",
  [TransactionStatus.ACCEPTED]: "Accepted — consensus reached",
  [TransactionStatus.FINALIZED]: "Finalized",
};

const STAGE_ORDER = [
  TransactionStatus.PENDING,
  TransactionStatus.PROPOSING,
  TransactionStatus.COMMITTING,
  TransactionStatus.REVEALING,
  TransactionStatus.ACCEPTED,
  TransactionStatus.FINALIZED,
];

export function TransactionProgress({
  phase,
  hash,
  error,
  settled,
  onRetry,
}: {
  phase: WritePhase;
  hash: string | null;
  error: string | null;
  settled: boolean;
  onRetry: () => void;
}) {
  if (phase === "idle") return null;

  if (phase === "signing") {
    return (
      <p role="status" aria-live="polite" className="text-xs font-mono text-t3">
        Confirm in your wallet...
      </p>
    );
  }

  if (phase === "error") {
    const classified = classifyError(error ?? "Transaction failed.");
    return (
      <div role="alert" className="rounded-lg border border-rose/30 bg-rose/[.06] p-3">
        <p className="text-[.6rem] font-mono uppercase tracking-[.14em] text-rose mb-1">
          {classified.kind === "UNKNOWN" ? "Error" : classified.kind.replace("_", " ")}
        </p>
        <p className="text-xs text-rose font-mono mb-1.5">{classified.message}</p>
        <p className="text-[.65rem] font-mono text-t3">{classified.guidance}</p>
      </div>
    );
  }

  if (phase === "retryable") {
    return (
      <div role="alert" className="rounded-lg border border-amber/30 bg-amber/[.06] p-3">
        <p className="text-xs font-mono text-amber2 mb-2">
          Validators couldn&apos;t reach consensus on this round (UNDETERMINED, or a leader/validator
          timeout). Nothing was written to the contract — this is safe to retry.
        </p>
        {hash && (
          <p className="text-[.65rem] font-mono text-t3 mb-2 break-all">tx: {hash}</p>
        )}
        <button
          type="button"
          onClick={onRetry}
          className="text-xs font-mono text-amber2 underline underline-offset-4 hover:text-amber"
        >
          Retry
        </button>
      </div>
    );
  }

  // A real TransactionStatus value — show stage progression.
  const status = phase as TransactionStatus;
  const currentIndex = STAGE_ORDER.indexOf(status);
  const label = STAGE_LABELS[status] ?? status;

  return (
    <div role="status" aria-live="polite" className="rounded-lg border border-wist/15 bg-wist/[.04] p-3">
      <div className="flex items-center gap-2 mb-2">
        {settled ? (
          <span className="h-2 w-2 rounded-full bg-vgreen2 shrink-0" aria-hidden="true" />
        ) : (
          <span className="h-2 w-2 rounded-full bg-wist animate-pulse shrink-0" aria-hidden="true" />
        )}
        <p className="text-xs font-mono text-t2">{label}</p>
      </div>
      {currentIndex >= 0 && (
        <div className="flex gap-1 mb-2" aria-hidden="true">
          {STAGE_ORDER.map((s, i) => (
            <span
              key={s}
              className={`h-1 flex-1 rounded-full ${i <= currentIndex ? "bg-wist" : "bg-wist/15"}`}
            />
          ))}
        </div>
      )}
      {status === TransactionStatus.ACCEPTED && (
        <p className="text-[.65rem] font-mono text-t3">
          Accepted by consensus — can still change during the appeal window until finalized.
        </p>
      )}
      {hash && <p className="text-[.65rem] font-mono text-t3 mt-1 break-all">tx: {hash}</p>}
    </div>
  );
}
