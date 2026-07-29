"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { VertexLogo } from "@/components/logo/VertexLogo";
import { cn } from "@/lib/utils";
import { NotificationsPanel } from "@/components/nav/NotificationsPanel";

const links = [
  { href: "/", label: "Home" },
  { href: "/bounties", label: "Bounties" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/analytics", label: "Analytics" },
  { href: "/search", label: "Search" },
  { href: "/admin", label: "Admin" },
];

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="fixed inset-x-0 top-0 z-[300] flex items-center justify-between gap-3 px-3 py-3 md:px-6">
      <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="Vertex home">
        <VertexLogo size={26} />
        <span className="hidden sm:inline font-display text-sm font-semibold tracking-tight text-alice">
          Vertex
        </span>
      </Link>

      <nav
        aria-label="Primary"
        className="flex gap-0.5 rounded-full border border-wist/[.15] bg-prus/[.88] px-1.5 py-1.5 backdrop-blur-xl overflow-x-auto max-w-full"
      >
        {links.map((l) => {
          const active = l.href === "/" ? pathname === "/" : pathname?.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "whitespace-nowrap rounded-full px-3.5 py-1.5 font-mono text-[.62rem] font-medium uppercase tracking-[.1em] transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-wist",
                active
                  ? "bg-vertex-gradient text-alice"
                  : "text-t3 hover:bg-maj/10 hover:text-t2"
              )}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2 shrink-0">
        <NotificationsPanel />
        <ConnectButton showBalance={false} chainStatus="icon" accountStatus="avatar" />
      </div>
    </header>
  );
}
