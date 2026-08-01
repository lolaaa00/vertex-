import { cn } from "@/lib/utils";

export function Badge({
  children,
  className,
  pulse = true,
}: {
  children: React.ReactNode;
  className?: string;
  pulse?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-wist/20 bg-wist/[.04] px-4 py-1.5 font-mono text-[.65rem] uppercase tracking-[.2em] text-wist",
        className
      )}
    >
      {pulse && (
        <span
          className="h-1.5 w-1.5 rounded-full bg-maj shadow-[0_0_10px_#6A4DD4] animate-pulse-dot motion-reduce:animate-none"
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

export type BountyStatus =
  | "open"
  | "submissions_closed"
  | "evaluating"
  | "settled"
  | "cancelled";

const statusStyles: Record<BountyStatus, string> = {
  open: "text-vgreen2 bg-vgreen/[.07] border-vgreen/20",
  submissions_closed: "text-amber2 bg-amber/[.07] border-amber/20",
  evaluating: "text-amber2 bg-amber/[.07] border-amber/20",
  settled: "text-wist bg-maj/[.08] border-maj/20",
  cancelled: "text-t3 bg-wist/[.04] border-wist/15",
};

const statusLabels: Record<BountyStatus, string> = {
  open: "Open",
  submissions_closed: "Submissions Closed",
  evaluating: "Evaluating",
  settled: "Evaluation Complete",
  cancelled: "Cancelled",
};

export function StatusBadge({ status }: { status: BountyStatus }) {
  const label = statusLabels[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[.58rem] uppercase tracking-[.14em]",
        statusStyles[status]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse-dot motion-reduce:animate-none" aria-hidden="true" />
      {label}
    </span>
  );
}
