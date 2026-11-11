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
