"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { studionet } from "./chains";

// WalletConnect Cloud project ID — required for RainbowKit's connector list
// (MetaMask, Rainbow, Zerion, WalletConnect, and others are all bundled in via
// getDefaultConfig's default wallet groups, no extra wiring needed).
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "MISSING_PROJECT_ID";

export const wagmiConfig = getDefaultConfig({
  appName: "Vertex",
  projectId,
  chains: [studionet],
  transports: {
    [studionet.id]: http(),
  },
  ssr: true,
});
