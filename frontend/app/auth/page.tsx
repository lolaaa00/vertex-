"use client";

import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { truncateAddress } from "@/lib/utils";

type LinkedAccount = "github" | "x";

export default function AuthPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync, isPending } = useSignMessage();
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linked, setLinked] = useState<Record<LinkedAccount, boolean>>({
    github: false,
    x: false,
  });

  async function handleSignIn() {
    if (!address) return;
    setError(null);
    try {
      // SIWE-style challenge. TODO: replace this static message with a
      // server-issued SIWE message (domain, nonce, issued-at) from a
      // Supabase Edge Function, then POST the signature back for
      // verification per MEMORY.md's wallet-only auth decision.
      const message = `Sign in to Vertex\n\nWallet: ${address}\nTimestamp: ${new Date().toISOString()}`;
      await signMessageAsync({ message });
      setSignedIn(true);
    } catch (e) {
      setError("Signature request was rejected or failed.");
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-2 text-center">
        Sign in to <span className="text-gradient">Vertex</span>
      </h1>
      <p className="text-t2 text-center mb-8">
        Wallet-first authentication. No email or password — ever.
      </p>

      <GlassCard className="p-7 flex flex-col gap-6">
        <Step
          index={1}
          title="Connect your wallet"
          done={isConnected}
        >
          <div className="mt-3">
            <ConnectButton />
          </div>
        </Step>

        <Step index={2} title="Sign the login message" done={signedIn} disabled={!isConnected}>
          {isConnected && !signedIn && (
            <Button className="mt-3" onClick={handleSignIn} disabled={isPending}>
              {isPending ? "Awaiting signature..." : "Sign In"}
            </Button>
          )}
          {error && <p className="mt-2 text-xs text-rose font-mono">{error}</p>}
          {signedIn && address && (
            <p className="mt-2 text-xs text-vgreen2 font-mono">
              Signed in as {truncateAddress(address, 6)}.
            </p>
          )}
        </Step>

        <Step index={3} title="Link social accounts (optional)" done={false} disabled={!signedIn}>
          <div className="mt-3 flex flex-col sm:flex-row gap-3">
            <Button
              variant="ghost"
              disabled={!signedIn}
              onClick={() => {
                // TODO: wire to Supabase OAuth connect flow (GitHub provider),
                // not a typed username field — see MEMORY.md's anti-impersonation decision.
                setLinked((l) => ({ ...l, github: !l.github }));
              }}
            >
              {linked.github ? "GitHub Linked ✓" : "Link GitHub"}
            </Button>
            <Button
              variant="ghost"
              disabled={!signedIn}
              onClick={() => {
                // TODO: wire to Supabase OAuth connect flow (X/Twitter provider).
                setLinked((l) => ({ ...l, x: !l.x }));
              }}
            >
              {linked.x ? "X Linked ✓" : "Link X"}
            </Button>
          </div>
        </Step>
      </GlassCard>
    </div>
  );
}

function Step({
  index,
  title,
  done,
  disabled,
  children,
}: {
  index: number;
  title: string;
  done: boolean;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className={disabled ? "opacity-40" : ""}>
      <div className="flex items-center gap-3">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[.65rem] font-semibold ${
            done ? "bg-vgreen text-prus" : "border border-wist/25 text-t2"
          }`}
          aria-hidden="true"
        >
          {done ? "✓" : index}
        </span>
        <h2 className="font-display text-sm font-semibold text-t1">{title}</h2>
      </div>
      {children}
    </div>
  );
}
