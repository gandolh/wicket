import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "@playwright/test";
import { stubApi } from "./fixtures";
import { SCREENS } from "./screens";

/**
 * Screenshots of every screen, for comparing a build with its comps. Skipped unless SHOTS_DIR names a folder
 * (outside git): `SHOTS_DIR=<folder> npx playwright test shots`.
 */
const DIR = process.env["SHOTS_DIR"] ?? "";
const WIDTHS = [
  { name: "1280", width: 1280, height: 800 },
  { name: "390", width: 390, height: 844 },
] as const;

test.skip(!DIR, "set SHOTS_DIR to take the screenshots");

for (const theme of ["light", "dark"] as const) {
  for (const size of WIDTHS) {
    for (const screen of SCREENS) {
      test(`${screen.name} ${theme} ${size.name}`, async ({ page }) => {
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.addInitScript((value) => localStorage.setItem("theme", value), theme);
        await stubApi(page, screen.queue, screen.session);
        await page.goto(screen.path);
        await page.waitForTimeout(500);
        await screen.act?.(page);
        await page.waitForTimeout(300);
        mkdirSync(DIR, { recursive: true });
        await page.screenshot({ path: join(DIR, `${screen.name}-${theme}-${size.name}.png`) });
      });
    }
  }
}
