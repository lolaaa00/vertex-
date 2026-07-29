import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";

export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this data. This is likely a temporary issue.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <GlassCard className="px-8 py-12 text-center border-rose/20" role="alert">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-rose/30 bg-rose/10 text-rose" aria-hidden="true">
        !
      </div>
      <h3 className="font-display text-lg font-semibold text-t1 mb-2">{title}</h3>
      <p className="text-sm text-t2 max-w-md mx-auto mb-6">{message}</p>
      {onRetry && (
        <Button variant="ghost" onClick={onRetry}>
          Try again
        </Button>
      )}
    </GlassCard>
  );
}
