"use client";

import { useCallback, useRef, useState } from "react";
import { TransactionStatus } from "genlayer-js/types";
import type { TransactionHash, CalldataEncodable } from "genlayer-js/types";
import { getGenlayerWriteClient, getGeneratedWriteClient } from "./genlayer";
import { extractErrorMessage } from "./errors";
import type { ActiveIdentity } from "./useActiveIdentity";

// Statuses that mean "nothing was written, this can be retried" — per the
// GenLayer submission spec: UNDETERMINED is not an error, it's a retryable
// consensus outcome where validators failed to agree. Same treatment for
// the two timeout variants.
const RETRYABLE_STATUSES = new Set<TransactionStatus>([
  TransactionStatus.UNDETERMINED,
  TransactionStatus.VALIDATORS_TIMEOUT,
  TransactionStatus.LEADER_TIMEOUT,
  TransactionStatus.CANCELED,
]);

// Statuses that mean the write genuinely landed. ACCEPTED is shown as
// success but the caller should note it can still change during the appeal
// window until FINALIZED — see the `settled` flag.
const SETTLED_STATUSES = new Set<TransactionStatus>([
  TransactionStatus.ACCEPTED,
  TransactionStatus.FINALIZED,
]);

export type WriteArgs = {
  address: `0x${string}`;
  functionName: string;
  args: CalldataEncodable[];
  value: bigint;
};

export type WritePhase =
  | "idle"
  | "signing"
  | TransactionStatus
  | "retryable"
  | "error";

export function useContractWrite() {
  const [phase, setPhase] = useState<WritePhase>("idle");
  const [hash, setHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);
  const cancelled = useRef(false);

  const poll = useCallback(async (client: ReturnType<typeof getGenlayerWriteClient>, txHash: `0x${string}`) => {
    // Manual poll (not waitForTransactionReceipt) so intermediate consensus
    // stages — PROPOSING, COMMITTING, REVEALING — reach the UI instead of
    // only the final status. Consensus writes are slow (minutes); generous
    // interval and a high attempt cap.
    const intervalMs = 3000;
    const maxAttempts = 150; // ~7.5 minutes
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (cancelled.current) return;
      let tx;
      try {
        tx = await client.getTransaction({ hash: txHash as TransactionHash });
      } catch {
        await new Promise((r) => setTimeout(r, intervalMs));
        continue;
      }
      const status = tx.status as TransactionStatus;
      setPhase(status);
      if (RETRYABLE_STATUSES.has(status)) {
        setPhase("retryable");
        return;
      }
      if (SETTLED_STATUSES.has(status)) {
        setSettled(true);
        return;
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    // Exhausted attempts without a terminal status — treat as retryable
    // rather than silently hanging forever.
    setPhase("retryable");
  }, []);

  const execute = useCallback(
    async (identity: ActiveIdentity, write: WriteArgs) => {
      cancelled.current = false;
      setError(null);
      setSettled(false);
      setHash(null);
      setPhase("signing");
      try {
        if (identity.mode === "none") {
          throw new Error("No wallet connected — connect a wallet or generate one first.");
        }
        const client =
          identity.mode === "injected"
            ? getGenlayerWriteClient(identity.address)
            : getGeneratedWriteClient(identity.account);
        const txHash = await client.writeContract(write);
        setHash(txHash);
        setPhase(TransactionStatus.PENDING);
        await poll(client, txHash);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("[useContractWrite] write failed:", err);
        setPhase("error");
        setError(extractErrorMessage(err));
      }
    },
    [poll]
  );

  const reset = useCallback(() => {
    cancelled.current = true;
    setPhase("idle");
    setHash(null);
    setError(null);
    setSettled(false);
  }, []);

  return { phase, hash, error, settled, execute, reset };
}
