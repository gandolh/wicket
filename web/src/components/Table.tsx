import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/**
 * A table that scrolls sideways when it is too wide. It sits inside a card, so it has no surface of its own. The
 * last row has no rule under it, and below a 380 px page the cells take 8 px of side padding (12 at the ends) so
 * nothing clips.
 */
export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "overflow-x-auto",
        "max-[379px]:[&_td]:px-2 max-[379px]:[&_th]:px-2",
        "max-[379px]:[&_td:first-child]:pl-3 max-[379px]:[&_th:first-child]:pl-3",
        "max-[379px]:[&_td:last-child]:pr-3 max-[379px]:[&_th:last-child]:pr-3",
        className,
      )}
    >
      <table className="w-full border-collapse [&_tbody_tr:last-child_td]:border-b-0">{children}</table>
    </div>
  );
}

/** A column heading. `right` right-aligns it over a column of figures. */
export function Th({ children, right = false }: { children: ReactNode; right?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-line px-4 py-2 text-small font-medium whitespace-nowrap text-ink-muted max-[560px]:px-3 max-[560px]:py-1.5",
        right ? "text-right" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

/** A cell, 40 px tall. `right` right-aligns it; `mono` sets it in the figures face. */
export function Td({
  children,
  right = false,
  mono = false,
  className,
}: {
  children: ReactNode;
  right?: boolean;
  mono?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "h-10 border-b border-line px-4 whitespace-nowrap max-[560px]:px-3",
        right ? "text-right" : "text-left",
        mono && "font-mono font-medium",
        className,
      )}
    >
      {children}
    </td>
  );
}

/** What stands in for a table with nothing in it. */
export function EmptyRow({ children }: { children: ReactNode }) {
  return <p className="m-0 px-4 py-4 text-ink-muted">{children}</p>;
}
