import { cn } from "@/lib/utils";
import Link from "next/link";
import { ButtonHTMLAttributes } from "react";

type CommonProps = {
  variant?: "primary" | "ghost";
  className?: string;
  children: React.ReactNode;
};

// rounded-lg, not rounded-full — a pill shape on every button in the app
// (nav, forms, CTAs alike) is one of the tells that reads as a template
// rather than a considered UI. Flat colors, no glow shadow, no hover-lift;
// state is communicated by a background/border shift only.
const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-display text-[.9375rem] font-semibold px-6 py-2.5 transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wist disabled:opacity-40 disabled:pointer-events-none";

const variants: Record<string, string> = {
  primary: "bg-maj text-alice hover:bg-maj/85",
  ghost:
    "border border-wist/20 bg-transparent text-alice hover:border-wist/40 hover:bg-wist/[.05]",
};

export function Button({
  variant = "primary",
  className,
  children,
  ...props
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(base, variants[variant], className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  className,
  children,
}: CommonProps & { href: string }) {
  return (
    <Link href={href} className={cn(base, variants[variant], className)}>
      {children}
    </Link>
  );
}
