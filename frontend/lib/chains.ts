import { defineChain } from "viem";

// genlayer-js@0.3.4 only ships a `simulator` chain export (genlayer-js/chains)
// for the local GenVM simulator — there is no built-in `studionet` export.
// StudioNet shares the simulator's chain id (61999) but uses a different
// hosted RPC endpoint, so we define it the same way genlayer-js defines
// `simulator` internally (via viem's `defineChain`), rather than inventing a
// genlayer-js API that doesn't exist. Confirmed against
// node_modules/genlayer-js/src/chains/simulator.ts on 2026-07-29.
export const studionet = defineChain({
  id: 61_999,
  name: "GenLayer StudioNet",
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api"],
    },
  },
  nativeCurrency: {
    name: "GEN Token",
    symbol: "GEN",
    decimals: 18,
  },
  blockExplorers: {
    default: {
      name: "GenLayer Explorer",
      url: "https://genlayer-explorer.vercel.app",
    },
  },
  testnet: true,
});
