export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-4 py-16"
      role="status"
      aria-live="polite"
    >
      <div className="relative h-10 w-10">
        <div className="absolute inset-0 rounded-full border-2 border-wist/15" />
        <div className="absolute inset-0 rounded-full border-2 border-t-maj border-r-transparent border-b-transparent border-l-transparent animate-spin motion-reduce:animate-[spin_2s_linear_infinite]" />
      </div>
      <p className="font-mono text-[.65rem] uppercase tracking-[.2em] text-t3">{label}</p>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div
      className="animate-pulse rounded-[20px] border border-wist/10 bg-prus2/40 p-6 h-40 motion-reduce:animate-none"
      aria-hidden="true"
    >
      <div className="h-4 w-2/3 rounded bg-wist/10 mb-3" />
      <div className="h-3 w-full rounded bg-wist/5 mb-2" />
      <div className="h-3 w-5/6 rounded bg-wist/5" />
    </div>
  );
}
