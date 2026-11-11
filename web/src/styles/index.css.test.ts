import { describe, expect, it } from "vitest";
import css from "./index.css?inline";

/** The page's stylesheet as the Tailwind plugin builds it: the tokens exist, and Tailwind's own scales don't. */
describe("the page's stylesheet", () => {
  it("builds the page's tokens as utilities", () => {
    for (const utility of [".bg-surface-sunk", ".text-ink-muted", ".border-line", ".shadow-card"])
      expect(css).toContain(utility);
    expect(css).toContain("--color-ink-muted");
    expect(css).toMatch(/--text-small:\s*12px/);
  });

  it("builds no class from Tailwind's default scales", () => {
    expect(css).not.toContain(".bg-red-500");
    expect(css).not.toContain(".text-sm{");
    expect(css).not.toContain(".rounded-lg");
  });
});
