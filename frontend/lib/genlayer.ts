import { createClient } from "genlayer-js";
import { studionet } from "./chains";

// The Vertex bounty-fusion contract address, set via
// NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS. See MEMORY.md for the current
// deployed address.
export const VERTEX_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS ?? "";

const rpcUrl = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL;

if (!VERTEX_CONTRACT_ADDRESS) {
  // eslint-disable-next-line no-console
  console.warn(
    "[lib/genlayer] NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS is not set — contract reads/writes are disabled until it is."
  );
}

// Read-only GenLayer client for StudioNet. No account/signer is attached
// here — bounty/submission/contribution-graph reads go through the Supabase
// mirror (lib/data.ts), kept in sync by backend/supabase/functions/
// sync-chain-state. This client is for direct on-chain reads only (e.g.
// verifying a just-submitted write before the ~1min sync cron catches up).
export const genlayerClient = createClient({
  chain: studionet,
  ...(rpcUrl ? { endpoint: rpcUrl } : {}),
});

// Write client factory — signs transactions through the connected browser
// wallet. Built per-call (not at module load) since the wallet address is
// only known once the user has connected via RainbowKit/wagmi. Verified
// against https://docs.genlayer.com/api-references/genlayer-js
// ("Using with a wallet provider (MetaMask)").
export function getGenlayerWriteClient(address: `0x${string}`) {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error(
      "No wallet provider found (window.ethereum) — connect a wallet before submitting a transaction."
    );
  }
  return createClient({
    chain: studionet,
    ...(rpcUrl ? { endpoint: rpcUrl } : {}),
    account: address,
    provider: window.ethereum,
  });
}
