"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import {
  clearGeneratedWallet,
  generateAndPersistWallet,
  getGeneratedAccount,
  importPrivateKey,
  loadGeneratedPrivateKey,
  type GeneratedAccount,
} from "./generatedWallet";

// Single source of truth for "which identity is active" across the app —
// reads AND writes must agree on this, per the GenLayer submission spec's
// two-wallet requirement. Injected (MetaMask/RainbowKit) always wins when
// connected; otherwise falls back to the generated local-key identity if
// one has been created.
export type ActiveIdentity =
  | { mode: "injected"; address: `0x${string}` }
  | { mode: "generated"; address: `0x${string}`; account: GeneratedAccount }
  | { mode: "none"; address: null };

export function useActiveIdentity(): ActiveIdentity & {
  hasGeneratedWallet: boolean;
  generate: () => GeneratedAccount;
  importKey: (pk: `0x${string}`) => GeneratedAccount;
  clear: () => void;
} {
  const { address: injectedAddress, isConnected } = useAccount();
  const [generatedAccount, setGeneratedAccount] = useState<GeneratedAccount | null>(null);

  useEffect(() => {
    if (isConnected) return; // injected takes priority, don't bother loading
    setGeneratedAccount(getGeneratedAccount());
  }, [isConnected]);

  const generate = useCallback(() => {
    const account = generateAndPersistWallet();
    setGeneratedAccount(account);
    return account;
  }, []);

  const importKey = useCallback((pk: `0x${string}`) => {
    const account = importPrivateKey(pk);
    setGeneratedAccount(account);
    return account;
  }, []);

  const clear = useCallback(() => {
    clearGeneratedWallet();
    setGeneratedAccount(null);
  }, []);

  const hasGeneratedWallet = generatedAccount != null || loadGeneratedPrivateKey() != null;

  if (isConnected && injectedAddress) {
    return { mode: "injected", address: injectedAddress, hasGeneratedWallet, generate, importKey, clear };
  }
  if (generatedAccount) {
    return {
      mode: "generated",
      address: generatedAccount.address,
      account: generatedAccount,
      hasGeneratedWallet,
      generate,
      importKey,
      clear,
    };
  }
  return { mode: "none", address: null, hasGeneratedWallet, generate, importKey, clear };
}
