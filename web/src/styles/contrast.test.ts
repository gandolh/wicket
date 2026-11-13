import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * Contrast over the tokens as the stylesheet holds them: every text pair clears 4.5:1, every icon, edge and ring
 * pair clears 3:1, in both themes. The pairs are the ones the page draws; the mixes (a notice's wash) are computed
 * the way `color-mix(in srgb)` does.
 */
const css = readFileSync(new URL("./index.css", import.meta.url), "utf8");

type Theme = "light" | "dark";
const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as never;

function token(name: string, theme: Theme): string {
  const match = new RegExp(`--color-${name}:\\s*light-dark\\((#[0-9a-f]{6}),\\s*(#[0-9a-f]{6})\\)`).exec(css);
  if (!match) throw new Error(`no light-dark pair for ${name}`);
  return (theme === "light" ? match[1] : match[2]) as string;
}

/** A token over the surface, mixed at `percent`, as the wash tokens are. */
function wash(name: string, theme: Theme, percent = 12): [number, number, number] {
  const top = rgb(token(name, theme));
  const base = rgb(token("surface", theme));
  return top.map((value, i) => (value * percent + (base[i] as number) * (100 - percent)) / 100) as never;
}

function luminance([r, g, b]: [number, number, number]): number {
  const [lr, lg, lb] = [r, g, b].map((value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function ratio(a: [number, number, number], b: [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

const solid = (name: string, theme: Theme) => rgb(token(name, theme));

type Pair = [string, (theme: Theme) => [number, number, number], (theme: Theme) => [number, number, number]];
const pair = (label: string, fg: string, bg: string): Pair => [label, (t) => solid(fg, t), (t) => solid(bg, t)];

const TEXT: Pair[] = [
  pair("ink on page", "ink", "page"),
  pair("ink on surface", "ink", "surface"),
  pair("ink on surface-sunk", "ink", "surface-sunk"),
  pair("ink on accent-soft (count pill, chosen period)", "ink", "accent-soft"),
  pair("ink-muted on page", "ink-muted", "page"),
  pair("ink-muted on surface", "ink-muted", "surface"),
  pair("ink-muted on surface-sunk", "ink-muted", "surface-sunk"),
  pair("accent on page (links)", "accent", "page"),
  pair("accent on surface", "accent", "surface"),
  pair("accent on accent-soft (next chip)", "accent", "accent-soft"),
  pair("danger on page", "danger", "page"),
  pair("danger on surface", "danger", "surface"),
  pair("ok on surface", "ok", "surface"),
  pair("banner-text on banner-bg", "banner-text", "banner-bg"),
  pair("surface on danger (the dialog's solid confirm)", "surface", "danger"),
  ["danger on danger-wash (Force close, error notice)", (t) => solid("danger", t), (t) => wash("danger", t)],
  ["ink on ok-wash (success notice)", (t) => solid("ink", t), (t) => wash("ok", t)],
  ["danger on surface-sunk", (t) => solid("danger", t), (t) => solid("surface-sunk", t)],
];

const PARTS: Pair[] = [
  pair("line-control on surface (Period group, fields)", "line-control", "surface"),
  pair("line-control on surface-sunk (Cancel)", "line-control", "surface-sunk"),
  pair("accent on surface (focus ring)", "accent", "surface"),
  pair("accent on page (focus ring)", "accent", "page"),
  pair("accent on accent-soft (chosen period outline)", "accent", "accent-soft"),
  pair("danger-line on surface (Clear queue edge)", "danger-line", "surface"),
  ["danger-line on danger-wash (Force close edge)", (t) => solid("danger-line", t), (t) => wash("danger", t)],
];

for (const theme of ["light", "dark"] as const) {
  describe(`contrast, ${theme}`, () => {
    it.each(TEXT)("text: %s is at least 4.5:1", (_label, fg, bg) => {
      expect(ratio(fg(theme), bg(theme))).toBeGreaterThanOrEqual(4.5);
    });
    it.each(PARTS)("parts: %s is at least 3:1", (_label, fg, bg) => {
      expect(ratio(fg(theme), bg(theme))).toBeGreaterThanOrEqual(3);
    });
  });
}
