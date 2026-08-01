"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type NotificationRow = {
  id: string;
  type: string;
  payload: { title?: string; body?: string };
  read_at: string | null;
  created_at: string;
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  useEffect(() => {
    // RLS restricts rows to the authenticated user's own notifications — this
    // safely returns an empty list until a real Supabase Auth session (via
    // wallet-auth) exists, rather than erroring.
    supabase
      .from("notifications")
      .select("id, type, payload, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setNotifications(data as NotificationRow[]);
      });
  }, []);

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
          {notifications.length === 0 ? (
            <p className="px-3 py-4 text-xs text-t3">
              No notifications yet. Connect and sign in with your wallet to see activity here.
            </p>
          ) : (
            <ul className="flex flex-col gap-1 max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <li key={n.id}>
                  <div
                    className={cn(
                      "rounded-xl px-3 py-2.5 transition-colors hover:bg-wist/[.06]",
                      !n.read_at && "bg-maj/[.06]"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-display text-sm font-semibold text-t1">
                        {n.payload.title || n.type}
                      </p>
                      <span className="font-mono text-[.6rem] text-t3 shrink-0">
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    {n.payload.body && <p className="text-xs text-t2 mt-0.5">{n.payload.body}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
