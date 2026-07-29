import { cn } from "@/lib/utils";

type GlassCardProps = {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  topLineClassName?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "children">;

export function GlassCard({
  children,
  className,
  as: Tag = "div",
  topLineClassName,
  ...rest
}: GlassCardProps) {
  const Comp = Tag as React.ElementType;
  return (
    <Comp
      className={cn(
        "group relative overflow-hidden rounded-[20px] border border-wist/10 bg-prus2/45 backdrop-blur-xl transition-all duration-500 [transition-timing-function:cubic-bezier(.16,1,.3,1)] hover:-translate-y-1 hover:border-maj/30 hover:shadow-[0_20px_60px_rgba(106,77,212,.15)]",
        className
      )}
      {...rest}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-maj to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          topLineClassName
        )}
        aria-hidden="true"
      />
      {children}
    </Comp>
  );
}
