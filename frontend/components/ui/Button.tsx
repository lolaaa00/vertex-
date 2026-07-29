import { cn } from "@/lib/utils";
import Link from "next/link";
import { ButtonHTMLAttributes } from "react";

type CommonProps = {
  variant?: "primary" | "ghost";
  className?: string;
  children: React.ReactNode;
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-display text-[.9375rem] font-semibold px-8 py-3.5 transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-wist disabled:opacity-40 disabled:pointer-events-none";

const variants: Record<string, string> = {
  primary:
    "bg-maj text-alice shadow-[0_4px_24px_rgba(106,77,212,.35)] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(106,77,212,.55)]",
  ghost:
    "border border-wist/20 bg-transparent text-alice hover:border-wist hover:bg-wist/[.06] hover:-translate-y-0.5",
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
