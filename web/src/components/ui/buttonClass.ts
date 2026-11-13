import { cn } from "../../lib/cn";

const VARIANTS = {
  default: "border-line-control bg-surface-sunk text-ink hover:bg-line",
  // The plum-tinted button: a pale accent fill with a plum edge, the way the chosen period reads.
  primary: "border-accent bg-accent-soft text-ink hover:brightness-95",
  // An outline: Clear queue.
  danger: "border-danger-line bg-transparent text-danger hover:bg-danger/8",
  // A tint: Force close, the one loud control on the page.
  "danger-tint": "border-danger-line bg-danger-wash text-danger hover:bg-danger/20",
  // The dialog's confirm, the only solid red.
  "danger-solid": "border-danger bg-danger text-surface hover:brightness-108",
  link: "min-h-0 border-0 bg-transparent p-0 font-normal text-accent underline",
} as const;

export type ButtonVariant = keyof typeof VARIANTS;

/**
 * The page's button look, for a native `<button>` and for a Base UI part that renders one (a dialog's trigger and
 * close). `link` is a button that reads as a link, for a line of text with a button in it. Buttons are 40 px tall,
 * 44 on a phone.
 */
export function buttonClass(variant: ButtonVariant = "default", className?: string): string {
  return cn(
    "inline-flex min-h-10 cursor-pointer items-center justify-center rounded-control border px-4 font-bold whitespace-nowrap max-[560px]:min-h-11",
    "disabled:cursor-default disabled:opacity-60",
    VARIANTS[variant],
    className,
  );
}
