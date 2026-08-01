"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parseUnits } from "viem";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { TransactionStatus } from "genlayer-js/types";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { VERTEX_CONTRACT_ADDRESS, getGenlayerWriteClient } from "@/lib/genlayer";

const DEFAULT_CATEGORIES = ["security", "ux", "performance", "recovery", "documentation"];

export default function CreateBountyPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [evaluationCriteria, setEvaluationCriteria] = useState(DEFAULT_CATEGORIES.join(","));
  const [deadline, setDeadline] = useState("");
  const [rewardGen, setRewardGen] = useState("");

  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  if (!isConnected || !address) {
    return (
      <div className="max-w-lg mx-auto">
        <GlassCard className="p-6 text-center">
          <h3 className="font-display text-base font-semibold text-t1 mb-2">
            Connect a wallet to sponsor a bounty
          </h3>
          <p className="text-sm text-t2 mb-5">
            You&apos;ll fund the reward pool directly from your connected wallet.
          </p>
          <div className="flex justify-center">
            <ConnectButton />
          </div>
        </GlassCard>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!VERTEX_CONTRACT_ADDRESS) {
      setError("Contract address is not configured (NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS).");
      return;
    }
    const deadlineTs = Math.floor(new Date(deadline).getTime() / 1000);
    if (!deadline || Number.isNaN(deadlineTs) || deadlineTs <= Math.floor(Date.now() / 1000)) {
      setError("Submission deadline must be a valid future date/time.");
      return;
    }
    let valueWei: bigint;
    try {
      valueWei = parseUnits(rewardGen || "0", 18);
    } catch {
      setError("Reward amount must be a valid number.");
      return;
    }
    if (valueWei <= BigInt(0)) {
      setError("Reward amount must be greater than 0 GEN.");
      return;
    }

    setStatus("pending");
    try {
      const client = getGenlayerWriteClient(address as `0x${string}`);
      await client.connect("studionet");

      const hash = await client.writeContract({
        address: VERTEX_CONTRACT_ADDRESS as `0x${string}`,
        functionName: "create_bounty",
        args: [
          title.trim(),
          description.trim(),
          category.trim(),
          evaluationCriteria.trim(),
          deadlineTs,
          0,
        ],
        value: valueWei,
      });
      setTxHash(hash);

      await client.waitForTransactionReceipt({
        hash,
        status: TransactionStatus.ACCEPTED,
      });

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Transaction failed.");
    }
  }

  if (status === "success") {
    return (
      <div className="max-w-lg mx-auto">
        <GlassCard className="p-6 text-center">
          <h3 className="font-display text-base font-semibold text-vgreen2 mb-2">
            Bounty created on-chain
          </h3>
          <p className="text-sm text-t2 mb-1">
            Transaction accepted. It can take up to a minute for the sync-chain-state cron job to
            mirror this into the marketplace listing.
          </p>
          {txHash && (
            <p className="font-mono text-[.65rem] text-t3 break-all mt-3">{txHash}</p>
          )}
          <Button className="mt-5" onClick={() => router.push("/bounties")}>
            Go to Bounty Explorer
          </Button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-2">
        Sponsor a <span className="text-gradient">Bounty</span>
      </h1>
      <p className="text-t2 mb-8">
        Fund a bounty with native GEN. GenLayer evaluates every submission together and pays out
        proportionally — never a single winner-take-all vote.
      </p>

      <GlassCard className="p-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Field label="Title" htmlFor="bounty-title">
            <input
              id="bounty-title"
              required
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Build the Best Decentralized Identity Platform"
              className={inputClass}
            />
          </Field>

          <Field label="Description" htmlFor="bounty-description">
            <textarea
              id="bounty-description"
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does a strong submission need to do?"
              className={`${inputClass} resize-y`}
            />
          </Field>

          <Field label="Category" htmlFor="bounty-category">
            <input
              id="bounty-category"
              required
              list="category-options"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Identity"
              className={inputClass}
            />
            <datalist id="category-options">
              {DEFAULT_CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>

          <Field label="Evaluation criteria (comma-separated)" htmlFor="bounty-criteria">
            <input
              id="bounty-criteria"
              required
              value={evaluationCriteria}
              onChange={(e) => setEvaluationCriteria(e.target.value)}
              placeholder="security,ux,performance,recovery,documentation"
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Submission deadline" htmlFor="bounty-deadline">
              <input
                id="bounty-deadline"
                required
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Reward pool (GEN)" htmlFor="bounty-reward">
              <input
                id="bounty-reward"
                required
                type="number"
                min="0"
                step="any"
                value={rewardGen}
                onChange={(e) => setRewardGen(e.target.value)}
                placeholder="5000"
                className={inputClass}
              />
            </Field>
          </div>

          <Button type="submit" disabled={status === "pending"} className="self-start">
            {status === "pending" ? "Confirm in wallet..." : "Create Bounty"}
          </Button>

          {error && (
            <p role="alert" className="text-xs text-rose font-mono">
              {error}
            </p>
          )}
        </form>
      </GlassCard>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-wist/15 bg-prus/60 px-3.5 py-2.5 text-sm text-t1 placeholder:text-t3 outline-none transition-colors focus:border-maj focus-visible:outline focus-visible:outline-2 focus-visible:outline-wist";

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block font-mono text-[.62rem] uppercase tracking-[.14em] text-t3 mb-1.5"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
