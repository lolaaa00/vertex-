"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { loadGeneratedPrivateKey } from "@/lib/generatedWallet";
import { truncateAddress } from "@/lib/utils";
import type { useActiveIdentity } from "@/lib/useActiveIdentity";

type Identity = ReturnType<typeof useActiveIdentity>;

// Zero-friction fallback identity for users without MetaMask/an injected
// wallet. Not custody-grade — the private key lives in this browser's
// localStorage — so every action here is explicit and warned, never
// silent, per the GenLayer submission spec's generated-wallet rules.
export function GeneratedWalletPanel({ identity, compact = false }: { identity: Identity; compact?: boolean }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [importValue, setImportValue] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (identity.mode === "generated") {
    return (
      <GlassCard className={compact ? "p-4" : "p-6"}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="font-mono text-[.6rem] uppercase tracking-[.14em] text-amber2 mb-1">
              Generated Wallet (browser-only)
            </div>
            <div className="font-display text-base font-semibold text-t1">
              {truncateAddress(identity.address, 6)}
            </div>
          </div>
          <Button
            variant="ghost"
            className="text-xs"
            onClick={() => {
              navigator.clipboard.writeText(identity.address);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copied" : "Copy address"}
          </Button>
        </div>
        <p className="text-xs text-t3 mb-3">
          This key lives only in this browser&apos;s local storage. Clearing site data destroys it
          permanently — it is not custody-grade. Export it below to move to another device, or
          upgrade to a real wallet (MetaMask, Rainbow, etc.) any time by connecting one.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" className="text-xs" onClick={() => setShowExport((s) => !s)}>
            {showExport ? "Hide private key" : "Export private key"}
          </Button>
          <Button
            variant="ghost"
            className="text-xs border-rose/30 hover:border-rose/60"
            onClick={() => {
              if (
                window.confirm(
                  "This permanently deletes the local wallet from this browser. Make sure you've exported the private key if you want to keep this identity. Continue?"
                )
              ) {
                identity.clear();
              }
            }}
          >
            Delete
          </Button>
        </div>
        {showExport && (
          <div className="mt-3 rounded-lg border border-amber/30 bg-amber/[.06] p-3">
            <p className="text-[.65rem] font-mono text-amber2 mb-2">
              Anyone with this key can act as this wallet. Never share it or paste it anywhere
              except a wallet you trust.
            </p>
            <p className="font-mono text-xs text-t1 break-all select-all">
              {loadGeneratedPrivateKey()}
            </p>
          </div>
        )}
      </GlassCard>
    );
  }

  return (
    <GlassCard className={compact ? "p-4" : "p-6"}>
      <h3 className="font-display text-base font-semibold text-t1 mb-2">
        No wallet extension? Generate one
      </h3>
      {!acknowledged ? (
        <>
          <p className="text-xs text-t3 mb-3">
            This creates a signing key stored only in this browser&apos;s local storage — not a
            custodial account, not backed up anywhere by Vertex. Clearing your browser data
            destroys it permanently. You can export the key any time to move it elsewhere.
          </p>
          <Button variant="ghost" className="text-xs" onClick={() => setAcknowledged(true)}>
            I understand — continue
          </Button>
        </>
      ) : (
        <div className="flex flex-col gap-3">
          <Button className="self-start" onClick={() => identity.generate()}>
            Generate a wallet
          </Button>
          <details className="text-xs text-t3">
            <summary className="cursor-pointer font-mono text-[.62rem] uppercase tracking-[.14em]">
              Or import an existing private key
            </summary>
            <div className="mt-2 flex flex-col gap-2">
              <input
                type="password"
                value={importValue}
                onChange={(e) => setImportValue(e.target.value)}
                placeholder="0x..."
                className="w-full rounded-lg border border-wist/15 bg-prus/60 px-3 py-2 text-xs font-mono text-t1 placeholder:text-t3 outline-none focus:border-maj"
              />
              <Button
                variant="ghost"
                className="self-start text-xs"
                onClick={() => {
                  setImportError(null);
                  try {
                    identity.importKey(importValue.trim() as `0x${string}`);
                    setImportValue("");
                  } catch {
                    setImportError("That doesn't look like a valid private key.");
                  }
                }}
              >
                Import
              </Button>
              {importError && <p className="text-rose font-mono text-[.65rem]">{importError}</p>}
            </div>
          </details>
        </div>
      )}
    </GlassCard>
  );
}
