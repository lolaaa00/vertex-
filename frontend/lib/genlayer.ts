import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

// Use genlayer-js's own `studionet` export (not the manually-defined one in
// ./chains, which is a plain viem Chain for wagmi/RainbowKit's chain list).
// GenLayer writes need `consensusMainContract` (address + ABI) present on
// the chain object — only genlayer-js's native export has it; a bare viem
// `defineChain` does not, and writeContract fails with "Consensus main
// contract address not found in chain config" without it. Confirmed via
// `require('genlayer-js/chains').studionet` after upgrading to 1.1.8.

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

// Switches the connected wallet to StudioNet via plain EIP-3085/3326 calls
// (wallet_addEthereumChain / wallet_switchEthereumChain). Deliberately does
// NOT use the SDK's own `client.connect()` helper — that method also tries
// to install a MetaMask Snap (wallet_getSnaps / wallet_requestSnaps), which
// throws "Method not found: wallet_getSnaps" on wallets without Snap
// support (plain MetaMask, Rainbow, Coinbase Wallet, etc.), even though no
// Snap is actually required for the plain eth_sendTransaction write path
// genlayer-js uses under the hood. Confirmed by reading
// node_modules/genlayer-js/dist/index.js's `_sendTransaction`.
export async function ensureStudioNetwork() {
  if (typeof window === "undefined" || !window.ethereum) return;
  const chainIdHex = `0x${studionet.id.toString(16)}`;
  const currentChainId = (await window.ethereum.request({
    method: "eth_chainId",
  })) as string;
  if (currentChainId?.toLowerCase() === chainIdHex.toLowerCase()) return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  } catch (err) {
    const code = (err as { code?: number } | null)?.code;
    if (code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainIdHex,
            chainName: studionet.name,
            rpcUrls: studionet.rpcUrls.default.http,
            nativeCurrency: studionet.nativeCurrency,
            blockExplorerUrls: studionet.blockExplorers
              ? [studionet.blockExplorers.default.url]
              : [],
          },
        ],
      });
    } else {
      throw err;
    }
  }
}
