import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("keeps a size and a colour, which the page names itself", () => {
    expect(cn("text-ink", "text-body")).toBe("text-ink text-body");
    expect(cn("text-ink-muted", "text-small")).toBe("text-ink-muted text-small");
  });

  it("keeps a line height when a size follows it, as the sizes carry none", () => {
    expect(cn("leading-ticket", "text-ticket")).toBe("leading-ticket text-ticket");
  });

  it("lets the later of two sizes, colours, weights, radii or z values win", () => {
    expect(cn("text-small", "text-body")).toBe("text-body");
    expect(cn("text-ink", "text-ink-muted")).toBe("text-ink-muted");
    expect(cn("font-semibold", "font-title")).toBe("font-title");
    expect(cn("rounded-control", "rounded-card")).toBe("rounded-card");
    expect(cn("z-bar", "z-dialog")).toBe("z-dialog");
    expect(cn("px-2", "p-0")).toBe("p-0");
  });

  it("drops what is false", () => {
    const failed = false;
    expect(cn("p-2", failed && "p-4")).toBe("p-2");
  });
});
