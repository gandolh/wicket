import { expect, test, type Page } from "@playwright/test";

const LIGHT_PAGE = "rgb(244, 245, 247)";
const DARK_PAGE = "rgb(29, 33, 37)";

/** The account page, signed in, with the API mocked. */
async function openAccount(page: Page) {
  await page.route("**/wicket-api/auth/session", (route) =>
    route.fulfill({
      json: {
        user: { id: 1, username: "demo" },
        session: { origin: "password" },
        ward: { enabled: false, linked: false },
      },
    }),
  );
  await page.goto("/wicket/account");
  await expect(page.getByRole("radiogroup", { name: "Theme" })).toBeVisible();
}

test("a first visit is light, even when the system is dark", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await openAccount(page);

  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("body")).toHaveCSS("background-color", LIGHT_PAGE);
  await expect(page.getByRole("radio", { name: "Light" })).toBeChecked();
});

test("Dark is set before the first paint, and survives a reload", async ({ page }) => {
  await openAccount(page);
  await page.getByRole("radio", { name: "Dark" }).click();
  await expect(page.locator("body")).toHaveCSS("background-color", DARK_PAGE);

  // The attribute is there before the module script runs: read it at the first moment the document exists.
  await page.addInitScript(() => {
    document.addEventListener("readystatechange", () => {
      (window as unknown as { seen: string | undefined }).seen ??= document.documentElement.dataset["theme"];
    });
  });
  await page.reload();
  await expect(page.getByRole("radio", { name: "Dark" })).toBeChecked();
  await expect(page.locator("body")).toHaveCSS("background-color", DARK_PAGE);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => (window as unknown as { seen: string | undefined }).seen)).toBe("dark");
});

test("System follows the operating system, live", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await openAccount(page);
  await page.getByRole("radio", { name: "System" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "system");
  await expect(page.locator("body")).toHaveCSS("background-color", LIGHT_PAGE);

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("body")).toHaveCSS("background-color", DARK_PAGE);

  await page.reload();
  await expect(page.getByRole("radio", { name: "System" })).toBeChecked();
  await expect(page.locator("body")).toHaveCSS("background-color", DARK_PAGE);
});
