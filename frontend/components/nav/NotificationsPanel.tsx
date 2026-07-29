"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// TODO: wire to Supabase (realtime subscription on a `notifications` table)
// once the backend is live. Mock data below stands in for now.
const mockNotifications = [
  {
    id: "n1",
    title: "Evaluation complete",
    body: "Your bounty \"Decentralized Identity Platform\" finished evaluation.",
    time: "2h ago",
    unread: true,
  },
  {
    id: "n2",
    title: "New submission",
    body: "Carol submitted to \"On-Chain Analytics Dashboard\".",
    time: "5h ago",
    unread: true,
  },
  {
    id: "n3",
    title: "Reward settled",
    body: "1,500 GEN credited for your Documentation contribution.",
    time: "1d ago",
    unread: false,
  },
];

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unreadCount = mockNotifications.filter((n) => n.unread).length;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-wist/15 bg-prus/[.88] text-t2 backdrop-blur-xl transition-colors hover:text-alice focus-visible:outline focus-visible:outline-2 focus-visible:outline-wist"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 22a2.4 2.4 0 0 0 2.4-2.4h-4.8A2.4 2.4 0 0 0 12 22Zm7.2-6V11a7.2 7.2 0 0 0-5.4-6.97V3.6a1.8 1.8 0 1 0-3.6 0v.43A7.2 7.2 0 0 0 4.8 11v5l-1.8 1.8v.9h18v-.9L19.2 16Z"
            fill="currentColor"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose text-[9px] font-mono font-semibold text-prus">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-wist/10 bg-prus2/95 p-2 shadow-2xl backdrop-blur-xl"
        >
          <div className="px-3 py-2 font-mono text-[.6rem] uppercase tracking-[.18em] text-t3">
            Notifications
          </div>
          <ul className="flex flex-col gap-1 max-h-80 overflow-y-auto">
            {mockNotifications.map((n) => (
              <li key={n.id}>
                <div
                  className={cn(
                    "rounded-xl px-3 py-2.5 transition-colors hover:bg-wist/[.06]",
                    n.unread && "bg-maj/[.06]"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-display text-sm font-semibold text-t1">{n.title}</p>
                    <span className="font-mono text-[.6rem] text-t3 shrink-0">{n.time}</span>
                  </div>
                  <p className="text-xs text-t2 mt-0.5">{n.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
