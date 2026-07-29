import { GlassCard } from "@/components/ui/GlassCard";
import { ReactNode } from "react";

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <GlassCard className="px-8 py-14 text-center">
      <div
        className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-wist/20 bg-wist/[.06] text-wist"
        aria-hidden="true"
      >
        <span className="h-2 w-2 rounded-full bg-wist/60" />
      </div>
      <h3 className="font-display text-lg font-semibold text-t1 mb-2">{title}</h3>
      <p className="text-sm text-t2 max-w-md mx-auto mb-6">{message}</p>
      {action}
    </GlassCard>
  );
}
