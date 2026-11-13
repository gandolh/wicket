import type { ReactNode } from "react";
import { cn } from "../lib/cn";

/** A list of labelled facts: the term in muted ink on the left, its value beside it. */
export function Facts({ children }: { children: ReactNode }) {
  return <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5">{children}</dl>;
}

/** One term and its value. `numeric` sets the value in tabular figures. */
export function Fact({ term, children, numeric = false }: { term: string; children: ReactNode; numeric?: boolean }) {
  return (
    <>
      <dt className="text-ink-muted">{term}</dt>
      <dd className={cn("m-0 min-w-0 wrap-anywhere", numeric && "tabular-nums")}>{children}</dd>
    </>
  );
}

/** Facts in a two-column grid, each a small label over a bold value: the running call's four. */
export function FactGrid({ children }: { children: ReactNode }) {
  return <dl className="m-0 mt-3 grid grid-cols-2 gap-x-4 gap-y-3 max-[560px]:mt-1 max-[560px]:gap-y-2">{children}</dl>;
}

/** One label over its value. `mono` sets the value in the figures face. */
export function FactTile({ term, children, mono = false }: { term: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-small text-ink-muted">{term}</dt>
      <dd className={cn("m-0 text-heading wrap-anywhere", mono && "font-mono")}>{children}</dd>
    </div>
  );
}
