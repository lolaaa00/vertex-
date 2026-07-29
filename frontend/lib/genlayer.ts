import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

// The Vertex bounty-fusion contract address. Per MEMORY.md, the user deploys
// the contract manually via genlayer-cli on StudioNet and provides this
// address — it must never be hardcoded here.
// TODO: wire to deployed contract — set NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS
// once `intelligent-contract/contracts/vertex_bounty_fusion.py` is deployed.
export const VERTEX_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS ?? "";

const rpcUrl = process.env.NEXT_PUBLIC_GENLAYER_RPC_URL;

if (!VERTEX_CONTRACT_ADDRESS) {
  // eslint-disable-next-line no-console
  console.warn(
    "[lib/genlayer] NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS is not set — contract reads/writes are disabled until it is."
  );
}

// Read-only GenLayer client for StudioNet. No account/signer is attached here
// — writes (submitting solutions, closing bounties, triggering evaluation)
// happen through user-signed transactions built alongside the connected
// wallet in the wagmi/RainbowKit layer, not through this shared client.
export const genlayerClient = createClient({
  chain: studionet,
  ...(rpcUrl ? { endpoint: rpcUrl } : {}),
});

/**
 * Reads bounty + contribution-graph state from the Vertex Intelligent
 * Contract. Stubbed until the contract address is provided — callers should
 * treat a null return as "not yet wired" and render TODO/placeholder UI,
 * never a fabricated success state.
 *
 * TODO: wire to `intelligent-contract/contracts/vertex_bounty_fusion.py`
 * once deployed — replace with a real `genlayerClient.readContract(...)` call
 * against VERTEX_CONTRACT_ADDRESS.
 */
export async function getBountyOnChainState(_bountyId: string) {
  if (!VERTEX_CONTRACT_ADDRESS) return null;
  // TODO: wire to GenLayer contract read.
  return null;
}
