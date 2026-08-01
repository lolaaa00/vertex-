"use client";

import { useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { truncateAddress } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

type LinkedAccount = "github" | "x";

const FUNCTIONS_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}/functions/v1`;

// Supabase's OAuth provider id for X/Twitter is "twitter" even though the
// product is named X — see backend/supabase/functions/link-social.
const SUPABASE_PROVIDER: Record<LinkedAccount, "github" | "twitter"> = {
  github: "github",
  x: "twitter",
};

export default function AuthPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync, isPending } = useSignMessage();
  const [signedIn, setSignedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState<LinkedAccount | null>(null);
  const [linked, setLinked] = useState<Record<LinkedAccount, boolean>>({
    github: false,
    x: false,
  });

  // Detect an existing session on mount (covers the redirect back from an
  // OAuth linking round trip) and record any newly-linked identity.
  useEffect(() => {
    async function syncSession() {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) return;
      setSignedIn(true);
      const identities = session.user.identities ?? [];
      setLinked({
        github: identities.some((i) => i.provider === "github"),
        x: identities.some((i) => i.provider === "twitter"),
      });
      // Persist the verified identity into social_connections (idempotent —
      // no-op if there's nothing new to record).
      await fetch(`${FUNCTIONS_URL}/link-social`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
    }
    syncSession();
  }, []);

  async function handleSignIn() {
    if (!address) return;
    setError(null);
    try {
      const nonceRes = await fetch(`${FUNCTIONS_URL}/wallet-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "nonce", address }),
      });
      const nonceData = await nonceRes.json();
      if (!nonceRes.ok) throw new Error(nonceData.error ?? "failed to get sign-in challenge");

      const signature = await signMessageAsync({ message: nonceData.message });

      const verifyRes = await fetch(`${FUNCTIONS_URL}/wallet-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", address, signature, message: nonceData.message }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error ?? "signature verification failed");

      const { error: otpError } = await supabase.auth.verifyOtp({
        email: verifyData.email,
        token: verifyData.hashed_token,
        type: "email",
      });
      if (otpError) throw otpError;

      setSignedIn(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Signature request was rejected or failed.");
    }
  }

  async function handleLink(account: LinkedAccount) {
    setLinking(account);
    setError(null);
    try {
      const { error: linkError } = await supabase.auth.linkIdentity({
        provider: SUPABASE_PROVIDER[account],
        options: { redirectTo: `${window.location.origin}/auth` },
      });
      if (linkError) throw linkError;
      // linkIdentity redirects the browser away — nothing further runs here.
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to link ${account}.`);
      setLinking(null);
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
              disabled={!signedIn || linked.github || linking !== null}
              onClick={() => handleLink("github")}
            >
              {linked.github ? "GitHub Linked ✓" : linking === "github" ? "Redirecting..." : "Link GitHub"}
            </Button>
            <Button
              variant="ghost"
              disabled={!signedIn || linked.x || linking !== null}
              onClick={() => handleLink("x")}
            >
              {linked.x ? "X Linked ✓" : linking === "x" ? "Redirecting..." : "Link X"}
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
