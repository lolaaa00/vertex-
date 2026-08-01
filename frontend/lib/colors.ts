// Deterministic per-wallet color assignment. There's no "contributor color"
// concept in the database — this derives a stable visual identity from the
// wallet address alone so the same wallet always renders the same color.

export type ColorKey = "a" | "b" | "c" | "d" | "e";

const KEYS: ColorKey[] = ["a", "b", "c", "d", "e"];

export const CONTRIBUTOR_COLORS: Record<
  ColorKey,
  { text: string; bg: string; border: string }
> = {
  a: { text: "text-wist", bg: "bg-maj/10", border: "border-maj/30" },
  b: { text: "text-cyan", bg: "bg-cyan/10", border: "border-cyan/30" },
  c: { text: "text-vgreen", bg: "bg-vgreen/10", border: "border-vgreen/30" },
  d: { text: "text-amber", bg: "bg-amber/10", border: "border-amber/25" },
  e: { text: "text-rose", bg: "bg-rose/10", border: "border-rose/25" },
};

export function colorKeyForWallet(wallet: string): ColorKey {
  let hash = 0;
  for (let i = 0; i < wallet.length; i++) {
    hash = (hash * 31 + wallet.charCodeAt(i)) >>> 0;
  }
  return KEYS[hash % KEYS.length];
}

export function avatarLetterForWallet(wallet: string): string {
  const hex = wallet.startsWith("0x") ? wallet.slice(2) : wallet;
  return (hex[0] || "?").toUpperCase();
}
