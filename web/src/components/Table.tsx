import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/** A card holding a table that scrolls sideways when it is too wide. The last row has no rule under it. */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-card bg-surface shadow-card">
      <table className="w-full border-collapse [&_tbody_tr:last-child_td]:border-b-0">{children}</table>
    </div>
  );
}

const CELL = "border-b border-line px-3 py-2 whitespace-nowrap";

/** A column heading. `numeric` right-aligns it over a column of figures; the first column stays left. */
export function Th({ children, numeric = false }: { children: ReactNode; numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        CELL,
        "bg-surface-sunk text-small font-title text-ink-muted",
        numeric ? "text-right first:text-left" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

/** A cell. `numeric` sets tabular figures and right-aligns them; the first column stays left. */
export function Td({
  children,
  numeric = false,
  className,
}: {
  children: ReactNode;
  numeric?: boolean;
  className?: string;
}) {
  return (
    <td className={cn(CELL, numeric ? "text-right tabular-nums first:text-left" : "text-left", className)}>
      {children}
    </td>
  );
}

/** What stands in for a table with nothing in it. */
export function EmptyRow({ children }: { children: ReactNode }) {
  return <p className="m-0 rounded-card bg-surface px-5 py-4 text-ink-muted shadow-card">{children}</p>;
}
