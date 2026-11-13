import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * A raised card with a head band: the title on the left, an action (a button, a period switch) on the right, and
 * an optional note under or beside them. The card's body is whatever follows.
 */
export function Card({
  titleId,
  title,
  action,
  note,
  className,
  children,
}: {
  titleId: string;
  title: ReactNode;
  action?: ReactNode;
  note?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn("min-w-0 overflow-hidden rounded-card border border-line-strong bg-surface shadow-card", className)}
      aria-labelledby={titleId}
    >
      <div
        className={cn(
          "flex min-h-13 items-center justify-between gap-3 border-b border-line bg-surface-sunk px-4 py-2",
          "max-[560px]:min-h-12 max-[560px]:flex-wrap max-[560px]:px-3 max-[560px]:py-1.5",
          note && "max-[560px]:flex-col max-[560px]:items-start max-[560px]:gap-0 max-[560px]:py-2",
        )}
      >
        <h2 id={titleId} className="flex items-center gap-2 text-heading min-[561px]:text-title">
          {title}
        </h2>
        {action}
        {note && <p className="text-right text-small text-ink-muted max-[560px]:text-left">{note}</p>}
      </div>
      {children}
    </section>
  );
}
