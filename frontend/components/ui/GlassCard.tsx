import { cn } from "@/lib/utils";

type GlassCardProps = {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  topLineClassName?: string;
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "children">;

// Named GlassCard for historical reasons (kept to avoid touching ~25 call
// sites) but no longer glass: a flat, solid surface with a single-pixel
// border. No backdrop-blur, no hover glow/lift — those read as decoration
// rather than state, and a flat surface reads more like a real product
// than a marketing page. `topLineClassName` is accepted but unused now
// (dropped the gradient top-line hover accent); kept in the prop type so
// call sites passing it don't need to change.
export function GlassCard({
  children,
  className,
  as: Tag = "div",
  ...rest
}: GlassCardProps) {
  const Comp = Tag as React.ElementType;
  return (
    <Comp
      className={cn(
        "rounded-xl border border-wist/10 bg-prus2 transition-colors duration-150 hover:border-wist/20",
        className
      )}
      {...rest}
    >
      {children}
    </Comp>
  );
}
