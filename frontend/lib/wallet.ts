"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";

// WalletConnect Cloud project ID — required for RainbowKit's connector list
// (MetaMask, Rainbow, Zerion, WalletConnect, and others are all bundled in via
// getDefaultConfig's default wallet groups, no extra wiring needed).
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "MISSING_PROJECT_ID";

// TODO: wire GenLayer StudioNet as a custom wagmi chain once the chain's
// RPC/chainId are finalized. Using mainnet + sepolia as placeholders so the
// wallet stack (connect/disconnect/sign/balance) works end-to-end today.
export const wagmiConfig = getDefaultConfig({
  appName: "Vertex",
  projectId,
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
  ssr: true,
});
