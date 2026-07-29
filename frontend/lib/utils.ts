import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function truncateAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, 2 + chars)}...${address.slice(-chars)}`;
}

export function formatGen(amount: number): string {
  return new Intl.NumberFormat("en-US").format(amount);
}
