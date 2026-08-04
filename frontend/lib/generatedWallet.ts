"use client";

import { createAccount, generatePrivateKey } from "genlayer-js";

// A local, browser-only signing identity for users without an injected
// wallet (MetaMask, Rabby, etc). Per the GenLayer submission spec's
// two-wallet requirement: zero-friction fallback, persisted, with an
// explicit non-custodial warning and export/import so the identity isn't
// trapped in one browser.
const STORAGE_KEY = "vertex_generated_wallet_pk";

export type GeneratedAccount = ReturnType<typeof createAccount>;

export function loadGeneratedPrivateKey(): `0x${string}` | null {
  if (typeof window === "undefined") return null;
  const pk = window.localStorage.getItem(STORAGE_KEY);
  return pk && pk.startsWith("0x") ? (pk as `0x${string}`) : null;
}

export function generateAndPersistWallet(): GeneratedAccount {
  const pk = generatePrivateKey();
  window.localStorage.setItem(STORAGE_KEY, pk);
  return createAccount(pk);
}

// Never overwrites without the caller confirming first — see the "Never
// silently regenerate. Never overwrite without confirmation." rule.
export function importPrivateKey(pk: `0x${string}`): GeneratedAccount {
  const account = createAccount(pk); // throws on a malformed key
  window.localStorage.setItem(STORAGE_KEY, pk);
  return account;
}

export function getGeneratedAccount(): GeneratedAccount | null {
  const pk = loadGeneratedPrivateKey();
  if (!pk) return null;
  return createAccount(pk);
}

export function clearGeneratedWallet() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
