import { expect, test } from "@playwright/test";
import { stubApi } from "./fixtures";
import { SCREENS, type Screen } from "./screens";

/**
 * The Floor, screen by screen: every keyboard stop shows a focus ring, nothing moves under reduced motion, and a
 * 390 px phone never scrolls sideways.
 */
async function open(page: import("@playwright/test").Page, screen: Screen, theme = "light") {
  await page.addInitScript((value) => localStorage.setItem("theme", value), theme);
  await stubApi(page, screen.queue, screen.session);
  await page.goto(screen.path);
  await page.waitForTimeout(400);
  await screen.act?.(page);
  await page.waitForTimeout(200);
}

for (const screen of SCREENS) {
  test.describe(screen.name, () => {
    test("every Tab stop shows a visible focus ring", async ({ page }) => {
      await open(page, screen);
      let stops = 0;
      for (let step = 0; step < 40; step += 1) {
        await page.keyboard.press("Tab");
        const stop = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          if (el.hasAttribute("data-visited")) return "again" as const;
          el.setAttribute("data-visited", "");
          const style = getComputedStyle(el);
          const label = `${el.tagName} ${el.getAttribute("aria-label") ?? el.textContent?.trim().slice(0, 30) ?? ""}`;
          return { label, style: style.outlineStyle, width: parseFloat(style.outlineWidth), color: style.outlineColor };
        });
        if (stop === "again") break;
        if (stop === null) continue;
        stops += 1;
        expect(stop.style, `${stop.label} has an outline`).not.toBe("none");
        expect(stop.width, `${stop.label} outline width`).toBeGreaterThanOrEqual(2);
        expect(stop.color, `${stop.label} outline colour`).not.toBe("rgba(0, 0, 0, 0)");
      }
      expect(stops, "the screen has keyboard stops").toBeGreaterThan(0);
    });

    test("nothing runs under reduced motion", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await open(page, screen);
      const moving = await page.evaluate(() => {
        const running = document.getAnimations().filter((animation) => animation.playState === "running");
        const timed = [...document.querySelectorAll("*")].filter((el) => {
          const style = getComputedStyle(el);
          const transition = style.transitionDuration.split(",").some((value) => parseFloat(value) > 0);
          const animation = style.animationName !== "none" && parseFloat(style.animationDuration) > 0;
          return transition || animation;
        });
        return { running: running.length, timed: timed.map((el) => el.tagName + "." + el.className).slice(0, 5) };
      });
      expect(moving).toEqual({ running: 0, timed: [] });
    });

    for (const theme of ["light", "dark"]) {
      test(`390 px has no sideways scroll, ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await open(page, screen, theme);
        const widths = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          inner: window.innerWidth,
        }));
        expect(widths.scroll).toBeLessThanOrEqual(widths.inner);
      });
    }
  });
}
