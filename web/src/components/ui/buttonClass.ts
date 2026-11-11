import { cn } from "../../lib/cn";

const VARIANTS = {
  default: "",
  primary: "border-accent bg-accent text-surface hover:border-accent hover:brightness-108",
  danger: "border-danger-line bg-surface text-danger hover:border-danger",
  "danger-solid": "border-danger bg-danger text-surface hover:border-danger hover:brightness-108",
  link: "border-0 bg-transparent p-0 text-accent underline hover:border-0",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;

/**
 * The page's button look, for a native `<button>` and for a Base UI part that renders one (a dialog's trigger and
 * close). `link` is a button that reads as a link, for a line of text with a button in it.
 */
export function buttonClass(variant: ButtonVariant = "default", className?: string): string {
  return cn(
    "cursor-pointer rounded-control border border-line bg-surface-sunk px-3.5 py-1.5 font-semibold text-ink",
    "hover:border-ink-muted disabled:cursor-default disabled:opacity-60",
    VARIANTS[variant],
    variant === "link" && "font-normal",
    className,
  );
}
