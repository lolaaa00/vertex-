"use client";

import { useAccount, useBalance, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/states/EmptyState";
import { truncateAddress } from "@/lib/utils";

// Deferred: real transaction history needs a per-wallet activity index.
// The contract's `get_activity` view is scoped per-bounty (see
// vertex_bounty_fusion.py), not per-wallet, so a global feed here would
// require either iterating every bounty's activity log client-side or a
// dedicated Supabase table populated by sync-chain-state. Neither is wired
// yet — these are illustrative placeholder rows, not live data.
const placeholderTxHistory = [
  { hash: "0x4a7f1c8e...d291c847", type: "Reward received", amount: "+1,500 GEN", time: "1d ago" },
  { hash: "0x9c31ab02...1120fe45", type: "Bounty funded", amount: "-8,000 GEN", time: "4d ago" },
  { hash: "0x77e2bb90...cc03a1f2", type: "Submission recorded", amount: "0 GEN", time: "6d ago" },
];

export default function WalletPage() {
  const { address, isConnected, connector } = useAccount();
  const { data: balance } = useBalance({ address });
  const { disconnect } = useDisconnect();

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-2">
        Wallet <span className="text-gradient">Management</span>
      </h1>
      <p className="text-t2 mb-8">
        Connect with MetaMask, Rainbow, Zerion, or any WalletConnect-compatible
        wallet via RainbowKit.
      </p>

      {!isConnected ? (
        <EmptyState
          title="No wallet connected"
          message="Connect a wallet to view your balance and transaction history."
          action={<ConnectButton />}
        />
      ) : (
        <div className="flex flex-col gap-6">
          <GlassCard className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="font-mono text-[.6rem] uppercase tracking-[.14em] text-t3 mb-1">
                Connected via {connector?.name ?? "wallet"}
              </div>
              <div className="font-display text-lg font-semibold text-t1">
                {address ? truncateAddress(address, 6) : "—"}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="font-mono text-lg text-gradient font-medium">
                  {balance ? `${Number(balance.formatted).toFixed(4)} ${balance.symbol}` : "—"}
                </div>
                <div className="font-mono text-[.58rem] uppercase tracking-[.14em] text-t3">
                  Native Balance
                </div>
              </div>
              <Button variant="ghost" onClick={() => disconnect()}>
                Disconnect
              </Button>
            </div>
          </GlassCard>

          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="font-mono text-[.58rem] uppercase tracking-[.2em] text-t3">
                Transaction History (sample data)
              </span>
              <span className="flex-1 h-px bg-gradient-to-r from-wist/[.12] to-transparent" />
            </div>
            <div className="flex flex-col gap-2">
              {placeholderTxHistory.map((tx) => (
                <GlassCard key={tx.hash} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="font-display text-sm font-semibold text-t1">{tx.type}</div>
                    <div className="font-mono text-[.6rem] text-t3">{tx.hash}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm text-t2">{tx.amount}</div>
                    <div className="font-mono text-[.58rem] text-t3">{tx.time}</div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
